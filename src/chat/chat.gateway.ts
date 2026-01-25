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
// import { BlockManagementService } from '../friend-management/block-management.service.js';
import { ChatSchema, ChatDto } from './dto/chat.dto.js';
// import { group } from 'console';

@WebSocketGateway()
export class ChatGateway {
	@Inject(GeneralChatService)
	private generalChatService!: GeneralChatService;

	@Inject(PrivateChatService)
	private privateChatService!: PrivateChatService;

	// @Inject(BlockManagementService)
	// private blockService!: BlockManagementService;

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
		console.log("[connect]");
		if (!user?.id) {
			// Disconnect le client car ne doit pas etre connecte...
			console.warn(`[ChatGateway] Connection rejected: Missing JWT | SocketId: ${client.id}`);
			client.disconnect(true);
			return;
		}

		// Stocker les infos utilisateur dans socket.data recup via JWT
		client.data.userId = user.id;
		client.data.username = user.username;
		client.data.currentRoom = 'hub';


		client.join('hub');

		console.log(`[ChatGateway] Client connected | UserId: ${user.id} | Username: ${user.username} | SocketId: ${client.id}`);

		await this.broadcastRoomUsers(client, 'hub');
	}

	@SubscribeDisconnection()
	async handleDisconnect(@ConnectedSocket() client: Socket) {
		console.log("[disconnect]");
		console.log(`Client disconnected: ${client.id}`);

		const userId = client.data.userId;
		const username = client.data.username;
		const currentRoom = client.data.currentRoom;

		console.log(`[ChatGateway] Client disconnected | UserId: ${userId} | Username: ${username} | SocketId: ${client.id}`);

		// retirer des rooms...
		setTimeout(async () => {
			if (currentRoom && currentRoom !== 'hub') {
				await this.broadcastRoomUsers(client, currentRoom);
			}
			await this.broadcastRoomUsers(client, 'hub');
		}, 100);
	}

	@SubscribeMessage('get_hub_history')
	async handleGetHubHistory(@ConnectedSocket() client: Socket, @JWTBody() user: any) {
		console.log("[get_hub_history]");
		if (!user?.id) return;

		const history = await this.generalChatService.getGeneralHistory(user.id);
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
		console.log("[get_room_users]");
		const users = await this.getUsersInRoom(client, data.roomId);
		client.emit('room_users', { roomId: data.roomId, users });
	}

	@SubscribeMessage('join_room')
	async handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }, @JWTBody() user: any) {
		console.log("[join_room]");
		if (!user?.id) return;

		const { roomId } = data;
		const previousRoom = client.data.currentRoom;

		// Quitter l'ancienne room privée (mais rester dans le hub)
		if (previousRoom && previousRoom !== 'hub' && previousRoom !== roomId) {
			client.leave(previousRoom);
			await this.broadcastRoomUsers(client, previousRoom);
		}

		// Rejoindre la nouvelle room
		client.join(roomId);
		client.data.currentRoom = roomId;
		await this.broadcastRoomUsers(client, roomId);

		// Envoyer l'historique si c'est le hub
		if (roomId === 'hub') {
			await this.handleGetHubHistory(client, user);
		}

		// start test
		if (roomId.startsWith("group")) {
			console.log("[join_group]");
			const groupId = parseInt(roomId.slice(6));
			//await this.groupChatServie.getGroupHistory(groupId);
			const messages = await this.groupChatServie.getGroupHistory(groupId, user.id);
			client.emit('group_history', messages);
			console.log("messges : ", messages)
		}


		//



		// Envoyer la liste des utilisateurs
		const users = await this.getUsersInRoom(client, roomId);
		client.emit('room_users', { roomId, users });
	}

	@SubscribeMessage('leave_room')
	async handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }, @JWTBody() user: any) {
		console.log("[leave_room]");
		if (!user?.id) return;

		const { roomId } = data;

		// Ne pas permettre de quitter le hub
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
		console.log("[join_private_room]");
		if (!user?.id) return;

		const userId = user.id;
		const { friendId } = data;

		const roomId = await this.privateChatService.createPrivateRoom(userId, friendId);
		if (typeof roomId !== 'string') {
			client.emit('error', { message: 'Failed to create private room. You may not be friends.' });
			return;
		}

		// Quitter l'ancienne room privée
		const previousRoom = client.data.currentRoom;
		if (previousRoom && previousRoom !== 'hub' && previousRoom !== roomId) {
			client.leave(previousRoom);
			await this.broadcastRoomUsers(client, previousRoom);
		}

		client.join(roomId);
		client.data.currentRoom = roomId;
		await this.broadcastRoomUsers(client, roomId);

		// Envoyer l'historique privé
		const history = await this.privateChatService.getPrivateHistory(userId, friendId);
		console.log("here");
		console.log("History :", history[0]);
		const formattedHistory = history.map((msg: any) => ({
			userId: msg.senderId,
			username: msg.senderId === userId ? user.username : 'Friend',
			msgContent: msg.msgContent,
			roomId: roomId,
			created_at: msg.created_at,
		}));
		client.emit('private_history', formattedHistory);

		// Envoyer la liste des utilisateurs
		const users = await this.getUsersInRoom(client, roomId);
		client.emit('room_users', { roomId, users });
	}

	@SubscribeMessage('send_private_message')
	async handleSendPrivateMessage(
		@ConnectedSocket() client: Socket,
		@MessageBody() data: { friendId: number; content: string },
		@JWTBody() user: any
	) {
		console.log("[send_private_message]");
		console.log("MESSAGESSE")
		if (!user?.id) return;

		const fromId = user.id;
		const { friendId, content } = data;

		console.log('Handshake Auth:', client.handshake.auth);
		console.log('Handshake Query:', client.handshake.query);
		console.log('Client Data:', client.data);
		console.log("MESSAGEE")
		console.log('Client Auth:', (client as any).user || (client as any).data);

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
		console.log("[message]");
		if (!user?.id) {
			client.emit('error', { message: 'Authentication required' });
			return;
		}

		const { content, roomId } = body;
		const targetRoom = roomId || 'hub';

		console.log(
			content, roomId
		)

		if (roomId.startsWith("room")) { // if room_5_a_6?
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
			console.log(user1, user2);
			await this.privateChatService.savePrivateMessage(user1, user2, content, user?.id);
		}
		const messageData = {
			userId: user.id,
			username: user.username,
			msgContent: content,
			roomId: targetRoom,
			created_at: new Date().toISOString(),
		};

		// bloc de test
		// const testdata = {
		// 	userId: user.id,
		// 	username: user.username,
		// 	msgContent: "le message lul",
		// 	roomId: "group_1",
		// 	created_at: new Date().toISOString(),
		// };

		//client.nsp.in(targetRoom).emit('message', messageData);
		//client.nsp.in("group_1").emit('message', messageData);


		// fin du test

		console.log("sender : ", user.id)
		// test pour group
		if (roomId.startsWith("group")) {
			const groupId = parseInt(roomId.slice(6));
			console.log("room id : ", groupId);
			console.log("here room: ", roomId);
			if (!groupId)
				client.emit('error', { message: 'invalid group name' });
			if (groupId < 0)
				client.emit('error', { message: 'invalid group id' });
			console.log("group");
			this.groupChatServie.saveGroupMessage(groupId, user?.id, content); // nique tout
			console.log("here@ room", roomId);
			// recuperer les id?
			// verifier si tout les id sont correctes -> negatif, same id ?
			// le save private message sur le salon 
			// -> emit aux autres users?
			// !! pour les bloqued users, pas testablr actuellement
			//client.nsp.in(targetRoom).emit('message', messageData);
		}
		console.log("room : ", roomId);


		// Sauvegarder le message si c'est le hub 
		if (targetRoom === 'hub') {
			await this.generalChatService.saveGeneralMessage(user.id, user.username, content);
		}

		client.nsp.in(targetRoom).emit('message', messageData);
	}
}

// gestion des amis : par son username -> get l'id par le user managemement 
// table de demande d'ami : rajouter pending : si accepter -> enable, sinon delete
// si la  personne est connectee : notif pop up par les sockets 



// table des users. : pour le block et add 

// join all chat -> quand un user se connecte : connection a tout ses chans (amis, general, tournoi)
// id : id 1 + id 2
// pour le general : id 0?

// tournois : id specifique si doublons ? != historique OK


// pour les group chat : limiter a 16 users : taille max des tournois + stockage 
// plus facile 