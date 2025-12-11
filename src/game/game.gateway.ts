import {
	Inject,
	SubscribeConnection,
	SubscribeDisconnection,
	SubscribeMessage,
	WebSocketGateway,
} from 'my-fastify-decorators';
import type { Socket } from 'socket.io';
import { GameService } from './game.service.js';

@WebSocketGateway()
export class GameGateway {
	@Inject(GameService)
	private gameService!: GameService;

	@SubscribeConnection()
	handleConnection(client: Socket) {
		console.log(`Client connected: ${client.id}`);
	}

	@SubscribeDisconnection()
	handleDisconnect(client: Socket) {
		console.log(`Client disconnected: ${client.id}`);
	}

	@SubscribeMessage('gameUpdate')
	handleGameUpdate(client: Socket, data: any) {
		console.log(`Received game update from client ${client.id}:`, data);
		this.gameService.processGameUpdate(data);
		client.emit("gameUpdate", "You are linked with the game server updater");
	}
}
