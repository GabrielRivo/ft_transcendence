import { useState, useEffect, useCallback, useRef } from 'my-react';
import { chatSocket } from '../libs/socket';
import { useAuth } from './useAuth';

export interface ChatMessage {
	userId: number;
	username: string;
	msgContent: string;
	roomId: string;
	created_at: string;
}

export interface RoomUser {
	userId: number;
	username: string;
}

export interface ChatState {
	connected: boolean;
	currentRoom: string;
	messages: ChatMessage[];
	roomUsers: RoomUser[];
}

export function useChat() {
	const { user, isAuthenticated } = useAuth();
	const [connected, setConnected] = useState(false);
	const [currentRoom, setCurrentRoom] = useState('hub');
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
	const isConnecting = useRef(false);

	// Connecter au chat quand l'utilisateur est authentifié
	useEffect(() => {
		if (isAuthenticated && user && !user.noUsername && !isConnecting.current) {
			isConnecting.current = true;
			
			// Mettre à jour l'auth du socket
			chatSocket.auth = {
				userId: String(user.id),
				username: user.username,
			};

			chatSocket.connect();
		}

		return () => {
			if (chatSocket.connected) {
				chatSocket.disconnect();
			}
			isConnecting.current = false;
		};
	}, [isAuthenticated, user?.id, user?.username, user?.noUsername]);

	// Gérer les événements socket
	useEffect(() => {
		const handleConnect = () => {
			setConnected(true);
			console.log('Chat socket connected');
			// Demander l'historique du hub
			chatSocket.emit('get_hub_history');
		};

		const handleDisconnect = () => {
			setConnected(false);
			console.log('Chat socket disconnected');
		};

		const handleMessage = (msg: ChatMessage) => {
			setMessages((prev) => [...prev, msg]);
		};

		const handleHubHistory = (history: any[]) => {
			const formattedHistory: ChatMessage[] = history.map((h) => ({
				userId: h.userId,
				username: h.username || 'Unknown',
				msgContent: h.msgContent,
				roomId: h.roomId || 'hub',
				created_at: h.created_at,
			}));
			setMessages(formattedHistory.reverse());
		};

		const handlePrivateHistory = (history: any[]) => {
			const formattedHistory: ChatMessage[] = history.map((h) => ({
				userId: h.userId,
				username: h.username || 'Unknown',
				msgContent: h.msgContent,
				roomId: h.roomId,
				created_at: h.created_at,
			}));
			setMessages(formattedHistory.reverse());
		};

		const handleRoomUsersUpdate = (data: { roomId: string; users: RoomUser[] }) => {
			if (data.roomId === currentRoom) {
				setRoomUsers(data.users);
			}
		};

		const handleRoomUsers = (data: { roomId: string; users: RoomUser[] }) => {
			if (data.roomId === currentRoom) {
				setRoomUsers(data.users);
			}
		};

		chatSocket.on('connect', handleConnect);
		chatSocket.on('disconnect', handleDisconnect);
		chatSocket.on('message', handleMessage);
		chatSocket.on('hub_history', handleHubHistory);
		chatSocket.on('private_history', handlePrivateHistory);
		chatSocket.on('room_users_update', handleRoomUsersUpdate);
		chatSocket.on('room_users', handleRoomUsers);

		return () => {
			chatSocket.off('connect', handleConnect);
			chatSocket.off('disconnect', handleDisconnect);
			chatSocket.off('message', handleMessage);
			chatSocket.off('hub_history', handleHubHistory);
			chatSocket.off('private_history', handlePrivateHistory);
			chatSocket.off('room_users_update', handleRoomUsersUpdate);
			chatSocket.off('room_users', handleRoomUsers);
		};
	}, [currentRoom]);

	const sendMessage = useCallback(
		(content: string) => {
			if (!connected || !content.trim()) return;

			chatSocket.emit('message', {
				content: content.trim(),
				roomId: currentRoom,
			});
		},
		[connected, currentRoom],
	);

	const joinRoom = useCallback(
		(roomId: string) => {
			if (!connected) return;

			// Quitter l'ancienne room (sauf hub)
			if (currentRoom !== 'hub') {
				chatSocket.emit('leave_room', { roomId: currentRoom });
			}

			// Rejoindre la nouvelle room
			chatSocket.emit('join_room', { roomId });
			setCurrentRoom(roomId);
			setMessages([]);

			// Demander les utilisateurs de la room
			chatSocket.emit('get_room_users', { roomId });

			// Demander l'historique si c'est le hub
			if (roomId === 'hub') {
				chatSocket.emit('get_hub_history');
			}
		},
		[connected, currentRoom],
	);

	const joinPrivateRoom = useCallback(
		(friendId: number) => {
			if (!connected) return;

			chatSocket.emit('join_private_room', { friendId });
			const roomId = `room_${Math.min(user?.id || 0, friendId)}_${Math.max(user?.id || 0, friendId)}`;
			setCurrentRoom(roomId);
			setMessages([]);
		},
		[connected, user?.id],
	);

	return {
		connected,
		currentRoom,
		messages,
		roomUsers,
		sendMessage,
		joinRoom,
		joinPrivateRoom,
	};
}

