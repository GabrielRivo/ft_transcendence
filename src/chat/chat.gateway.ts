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
import { BlockManagementService } from '../friend-management/block-management.service.js';
import {ChatSchema, ChatDto }  from './dto/chat.dto.js'


@WebSocketGateway('/chat')
export class ChatGateway {
	@Inject(GeneralChatService)
	private chatService!: GeneralChatService;

	@Inject(BlockManagementService)
	private blockService!: BlockManagementService;


	@SubscribeConnection()
	handleConnection(@ConnectedSocket() client: Socket) {
		console.log(`Client connected: ${client.id}`);
		//client.join("hub");
	}

	@SubscribeMessage("message")
	@SocketSchema(ChatSchema)
	async handleMessage(
		@ConnectedSocket() client: Socket, 
		@MessageBody() body: ChatDto,    
		@JWTBody() user: any) 
	{

		// user = { // faire la gestion des rooms? 
		// 	id : 1,
		// 	username : "michel",
		// 	roomId : "hub"
		// };

		// user2 = {
		// 	id = 2,
		// 	username : "P"
		// };


		// console.log("test", body);
		//client.to("hub").emit("message", body);

		//if (!user) return;
		const sender = user || { id: 1, username: "michel" };
		const { content, roomId } = body;
		const targetRoom = roomId || "hub";
		const sockets = await client.nsp.in(targetRoom).fetchSockets();

		if (targetRoom === "hub") {
			await this.chatService.saveGeneralMessage(sender.id, content);
		} else {
			// register in other room later
		}
		for (const socket of sockets) {
			const recipientId = socket.data.userId;
		
			if (recipientId) {
				const isBlocked = await this.blockService.is_blocked(recipientId, sender.id);
				if (isBlocked) continue;
			}
			this.chatService.saveGeneralMessage(user.id, body.content);
			socket.emit("message", { 
				userId: user.id,
				username: user.username,
				msgContent: body.content,
				roomId : user.roomId,
				created_at: new Date().toISOString()
			});
		}
	}

		// client.to(user.roomId).emit("message", { // test
		// 	userId: user.id,
		// 	username: user.username,
		// 	msgContent: body.content,
		// 	roomId : user.roomId,
		// 	created_at: new Date().toISOString()
		// });

	@SubscribeMessage("join_room")
	handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
		client.join(data.roomId);
	}

	@SubscribeDisconnection()
	handleDisconnect(@ConnectedSocket() client: Socket) {
		console.log(`Client disconnected: ${client.id}`);
	}
}



// @ConnectedSocket() client: Socket, @MessageBody() message: string, @JWTBody() user : any


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


// regarder socket.io




// @WebSocketGateway()
// export class ChatGateway {
// 	@Inject(ChatService)
// 	private chatService!: ChatService;
	
// 	@SubscribeConnection()
// 	handleConnection(@ConnectedSocket() client: Socket) {
// 		console.log(`Client connected: ${client.id}`);
// 		client.join("hub");
// 	}
	
// 	@SubscribeMessage("message")
// 	handleMessage(@ConnectedSocket() client: Socket, @MessageBody() body : any) {
		
		
// 		client.broadcast.emit("message", 
// 			`${client.id}: a envoyer un message`
// 		)
// 		client.broadcast.to("hub").emit()
// 	}
	
	
// 	@SubscribeDisconnection()
// 	handleDisconnect(@ConnectedSocket() client: Socket) {
// 		console.log(`Client disconnected: ${client.id}`);
// 	}
// }