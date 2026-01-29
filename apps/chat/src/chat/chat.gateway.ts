import {
	Inject,
	SubscribeConnection,
	SubscribeDisconnection,
	WebSocketGateway,
	ConnectedSocket,
	MessageBody,
	JWTBody,
	SubscribeMessage,
	SocketSchema,
} from 'my-fastify-decorators';

import { Socket } from 'socket.io';
import { GeneralChatService } from './general-chat/general-chat.service.js';
import { PrivateChatService } from './private-chat/private-chat.service.js';
import { GroupChatService } from './group-chat/group-chat.service.js'
import { ChatSchema, ChatDto } from './dto/chat.dto.js';



@WebSocketGateway()
export class ChatGateway {
	@Inject(GeneralChatService)
	private generalChatService!: GeneralChatService;

	@Inject(PrivateChatService)
	private privateChatService!: PrivateChatService;

	@Inject(GroupChatService)
	private groupChatServie!: GroupChatService;

	// Helper: Récupérer les utilisateurs d'une room via Socket.io (dédupliqués par userId)
	private async getUsersInRoom(client: Socket, roomId: string): Promise<{ userId: number; username: string }[]> {
		const sockets = await client.nsp.in(roomId).fetchSockets();

		// Dédupliquer par userId (un utilisateur peut avoir plusieurs onglets/connexions)
		const userMap = new Map<number, string>();
		for (const s of sockets) {
			if (s.data.userId && !userMap.has(s.data.userId)) {
				userMap.set(s.data.userId, s.data.username);
			}
		}

		return Array.from(userMap.entries()).map(([userId, username]) => ({
			userId,
			username,
		}));
	}
	// permet d'indiquer la presence les users dans une room
	private async broadcastRoomUsers(client: Socket, roomId: string): Promise<void> {
		const users = await this.getUsersInRoom(client, roomId);
		client.nsp.in(roomId).emit('room_users_update', { roomId, users });
	}

	@SubscribeConnection()
	async handleConnection(@ConnectedSocket() client: Socket, @JWTBody() user: any) {
		if (!user?.id) {
			client.disconnect(true);
			return;
		}

		// Stocker les infos utilisateur dans socket.data recup via JWT
		client.data.userId = user.id;
		client.data.username = user.username;
		client.data.currentRoom = 'hub';


		client.join('hub');

		await this.broadcastRoomUsers(client, 'hub');
	}

	@SubscribeDisconnection()
	async handleDisconnect(@ConnectedSocket() client: Socket) {
		const currentRoom = client.data.currentRoom;
		setTimeout(async () => {
			if (currentRoom && currentRoom !== 'hub') {
				await this.broadcastRoomUsers(client, currentRoom);
			}
			await this.broadcastRoomUsers(client, 'hub');
		}, 100);
	}

	@SubscribeMessage('get_hub_history')
	async handleGetHubHistory(@ConnectedSocket() client: Socket, @JWTBody() user: any) {
		if (!user?.id) return;

		const history = await this.generalChatService.getGeneralHistory();
		const formattedHistory = history.map((msg: any) => ({
			userId: msg.userId,
			username: msg.username || 'Unknown',
			msgContent: msg.msgContent,
			roomId: 'hub',
			created_at: msg.created_at,
		}));
		client.emit('hub_history', formattedHistory);
	}

	@SubscribeMessage('get_room_users')
	async handleGetRoomUsers(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
		const users = await this.getUsersInRoom(client, data.roomId);
		client.emit('room_users', { roomId: data.roomId, users });
	}

	@SubscribeMessage('join_room')
	async handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }, @JWTBody() user: any) {
		if (!user?.id) return;

		const { roomId } = data;
		const previousRoom = client.data.currentRoom;
		if (previousRoom && previousRoom !== 'hub' && previousRoom !== roomId) {
			client.leave(previousRoom);
			await this.broadcastRoomUsers(client, previousRoom);
		}

		client.join(roomId);
		client.data.currentRoom = roomId;
		await this.broadcastRoomUsers(client, roomId);
		if (roomId === 'hub') {
			await this.handleGetHubHistory(client, user);
		}

		if (roomId.startsWith("group")) {
			const groupId = parseInt(roomId.slice(6));
			const messages = await this.groupChatServie.getGroupHistory(groupId, user.id);
			client.emit('group_history', messages);
		}

		const users = await this.getUsersInRoom(client, roomId);
		client.emit('room_users', { roomId, users });
	}

	@SubscribeMessage('leave_room')
	async handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }, @JWTBody() user: any) {
		if (!user?.id) return;

		const { roomId } = data;
		if (roomId === 'hub') return;

		client.leave(roomId);
		await this.broadcastRoomUsers(client, roomId);

		if (client.data.currentRoom === roomId) {
			client.data.currentRoom = 'hub';
		}
	}

	@SubscribeMessage('join_private_room')
	async handleJoinPrivateRoom(
		@ConnectedSocket() client: Socket,
		@MessageBody() data: { friendId: number },
		@JWTBody() user: any
	) {
		if (!user?.id) return;

		const userId = user.id;
		const { friendId } = data;

		const roomId = await this.privateChatService.createPrivateRoom(userId, friendId);
		if (typeof roomId !== 'string') {
			client.emit('error', { message: 'Failed to create private room. You may not be friends.' });
			return;
		}

		const previousRoom = client.data.currentRoom;
		if (previousRoom && previousRoom !== 'hub' && previousRoom !== roomId) {
			client.leave(previousRoom);
			await this.broadcastRoomUsers(client, previousRoom);
		}

		client.join(roomId);
		client.data.currentRoom = roomId;
		await this.broadcastRoomUsers(client, roomId);

		const history = await this.privateChatService.getPrivateHistory(userId, friendId);
		const formattedHistory = history.map((msg: any) => ({
			userId: msg.senderId,
			username: msg.senderId === userId ? user.username : 'Friend',
			msgContent: msg.msgContent,
			roomId: roomId,
			created_at: msg.created_at,
		}));
		client.emit('private_history', formattedHistory);

		const users = await this.getUsersInRoom(client, roomId);
		client.emit('room_users', { roomId, users });
	}

	@SubscribeMessage('send_private_message')
	async handleSendPrivateMessage(
		@ConnectedSocket() client: Socket,
		@MessageBody() data: { friendId: number; content: string },
		@JWTBody() user: any
	) {
		if (!user?.id) return;

		const fromId = user.id;
		const { friendId, content } = data;

		await this.privateChatService.savePrivateMessage(fromId, friendId, content, fromId);
		const roomId = `room_${Math.min(fromId, friendId)}_${Math.max(fromId, friendId)}`;

		const messageData = {
			userId: fromId,
			username: user.username,
			msgContent: content,
			roomId: roomId,
			created_at: new Date().toISOString(),
		};

		client.nsp.in(roomId).emit('message', messageData);
	}

	@SubscribeMessage('message')
	@SocketSchema(ChatSchema)
	async handleMessage(
		@ConnectedSocket() client: Socket,
		@MessageBody() body: ChatDto,
		@JWTBody() user: any
	) {
		if (!user?.id) {
			client.emit('error', { message: 'Authentication required' });
			return;
		}

		const { content, roomId } = body;
		const targetRoom = roomId || 'hub';

		if (roomId.startsWith("room")) {
			const users = roomId.slice(5).split("_").map((i) => !Number.isNaN(parseInt(i)) && parseInt(i));
			if (users.length != 2) {
				client.emit('error', { message: 'invalid user number' });
			}
			const [user1, user2] = users as [number, number];
			if (user1 >= user2) {
				client.emit('error', { message: 'invalid user sort' });
			}
			if (user1 == user2) {
				client.emit('error', { message: 'same id!' });
			}
			await this.privateChatService.savePrivateMessage(user1, user2, content, user?.id);
		}

		const messageData = {
			userId: user.id,
			username: user.username,
			msgContent: content,
			roomId: targetRoom,
			created_at: new Date().toISOString(),
		};
		if (roomId.startsWith("group")) {
			const groupId = parseInt(roomId.slice(6));
			if (!groupId)
				client.emit('error', { message: 'invalid group name' });
			if (groupId < 0)
				client.emit('error', { message: 'invalid group id' });
			this.groupChatServie.saveGroupMessage(groupId, user?.id, content);
		}
		

		if (targetRoom === 'hub') {
			await this.generalChatService.saveGeneralMessage(user.id, user.username, content);
		}

		client.nsp.in(targetRoom).emit('message', messageData);
	}
}
