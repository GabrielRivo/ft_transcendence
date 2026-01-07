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
import {ChatSchema, ChatDto }  from './dto/chat.dto.js'


@WebSocketGateway('/chat')
export class ChatGateway {
	@Inject(GeneralChatService)
	private chatService!: GeneralChatService;

	@SubscribeConnection()
	handleConnection(@ConnectedSocket() client: Socket) {
		console.log(`Client connected: ${client.id}`);
		client.join("hub");
	}

	@SubscribeMessage("message")
	@SocketSchema(ChatSchema)
	handleMessage(
		@ConnectedSocket() client: Socket, 
		@MessageBody() body: ChatDto,    
		@JWTBody() user: any) 
	{

		user = {
			id : 1,
			username : "michel"
		};
		console.log("test", body);
		//client.to("hub").emit("message", body);

		if (!user) return;

		this.chatService.saveGeneralMessage(user.id, body.content);

		client.to("hub").emit("message", {
			userId: user.id,
			username: user.username,
			msgContent: body.content,
			created_at: new Date().toISOString()
		});
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