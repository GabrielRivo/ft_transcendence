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
import { BlockManagementService } from '../friend-management/block-management.service.js';
import {ChatSchema, ChatDto }  from './dto/chat.dto.js'



@WebSocketGateway('/chat')
export class ChatGateway {
	// @InjectPlugin('io')
	// private server!: Server;

	@Inject(GeneralChatService)
	private generalChatService!: GeneralChatService;

	@Inject(PrivateChatService)
	private privateChatService!: PrivateChatService;

	@Inject(BlockManagementService)
	private blockService!: BlockManagementService;

	@SubscribeConnection()
	handleConnection(@ConnectedSocket() client: Socket) {
		console.log(`Client connected: ${client.id}`);
		client.join("hub");
	}

	@SubscribeMessage("join_private_room")
	async handleJoinPrivateRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { friendId: number })
	{
		const userId = client.data.id;
		const friendId = client.data.friendId

		const roomId = await this.privateChatService.createPrivateRoom(userId, friendId)
		if (typeof(roomId) != 'string')
			return { message : "Failed to create the mp between users"} // voir si client -> emit
		client.join(roomId);

		const history = await this.privateChatService.getPrivateHistory(userId, friendId);
		client.emit('private_history', history);
	}
	
	@SubscribeMessage("send_private_message")
	async handleSendPrivateMessage(@ConnectedSocket() client: Socket, @MessageBody() data: { friendId : number, content : string})
	{
		const fromId = client.data.userId
		const { friendId, content } = data
		this.privateChatService.savePrivateMessage(fromId, friendId, content) // await?
		const roomId = `room_${Math.min(fromId, friendId)}_${Math.max(fromId, friendId)}`;

		client.to(roomId).emit('new_private_message', { fromId, content, timestamp: new Date() });

	}


	@SubscribeMessage("message")
	@SocketSchema(ChatSchema)
	async handleMessage(
		@ConnectedSocket() client: Socket, 
		@MessageBody() body: ChatDto,    
		@JWTBody() user: any) 
	{
		const sender = user || { id: 1, username: "michel" };
		const { content, roomId } = body;
		const targetRoom = roomId || "hub";
		// const sockets = await client.nsp.in(targetRoom).fetchSockets();

		if (targetRoom === "hub") {
			console.log(sender)
		} else {
			// register in other room later
		}
			client.broadcast.in(targetRoom).emit("message", { 
				userId: sender.id,
				username: sender.username,
				msgContent: content,
				roomId : roomId,
				created_at: new Date().toISOString()
			});
		// }
	}
	@SubscribeMessage("join_room")
	handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
		client.join(data.roomId);
	}

	@SubscribeDisconnection()
	handleDisconnect(@ConnectedSocket() client: Socket) {
		console.log(`Client disconnected: ${client.id}`);
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
