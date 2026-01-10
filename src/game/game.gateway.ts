import {
	Inject,
	SubscribeConnection,
	SubscribeDisconnection,
	SubscribeMessage,
	WebSocketGateway,
} from 'my-fastify-decorators';
import { Socket } from 'socket.io';
import { GameService } from './game.service.js';


@WebSocketGateway("/game/pong")
export class GameGateway {
	@Inject(GameService)
	private gameService!: GameService;

	private playerSockets: Map<string, Socket> = new Map();
	private count = 0;
	private testId : string = "testId";

	@SubscribeConnection()
	handleConnection(client: Socket) {
		let userId = client.handshake.auth.userId;

		if (this.count >= 1)
			userId = this.testId;

		client.data.userId = userId;
		console.log(`Client connected: ${client.id} with userId: ${userId}`);
		this.count++;
		/*console.log(`Total connected clients: ${this.count}`);
		client.data.username = `id${this.count}`;*/
		client.emit("connection", `Welcome ${client.data.username}! You are connected to the Pong game server.`);
		if (this.playerSockets.has(userId)) {
			const oldClient = this.playerSockets.get(userId)!;
			oldClient.disconnect();
			console.log(`Disconnected old client for userId: ${userId}`);
		}
		this.playerSockets.set(userId, client);
		this.gameService.connectPlayer(client);
	}

	@SubscribeDisconnection()
	handleDisconnect(client: Socket) {
		this.gameService.disconnectPlayer(client);
		this.playerSockets.delete(client.data.userId);
		this.count--;
		console.log(`Client disconnected: ${client.data.userId}`);
		// if (client.data.gameId) {
		console.log(`Total connected clients: ${this.count}`);
	}

	@SubscribeMessage('playerInput')
	handleGameUpdate(client: Socket, data: any) {
		console.log(`Received game update from client ${client.id}:`, data);
		// this.gameService.processGameUpdate(data);
		this.gameService.processPlayerInput(client, data);
	}

	@SubscribeMessage('ping')
	handlePing(client: Socket) {
		client.emit('pong');
	}
}
