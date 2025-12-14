import {
	Inject,
	SubscribeConnection,
	SubscribeDisconnection,
	SubscribeMessage,
	WebSocketGateway,
} from 'my-fastify-decorators';
import type { Socket } from 'socket.io';
import { GameService } from './game.service.js';

//strucuture : client affiche le jeu, se lie au game updater, sur un click il demande le lancement d'une game de pong
// le game updater envoie les infos de la game au client via le channel game, les infos suivante passent par une room dans le channel pong
// le client recoit les infos de la game pong et les affiche, il envoie aussi les infos de son paddle au pong updater via la room pong
/*
- client -> game gateway : demande de lancement d'une game de pong
- game gateway -> game service : traitement de la demande de lancement
- game service -> pong updater : initialisation de la game de pong de maniere asynchrone

- pong updater -> game gateway : envoi des mises à jour de la game de pong
- game gateway -> client : transmission des mises à jour de la game de pong
- client -> game gateway : envoi des actions du joueur (déplacement du paddle)
- game gateway -> pong updater : transmission des actions du joueur

- pong updater : fin de game et nettoyage des ressources

*/
@WebSocketGateway("/game/pong")
export class GameGateway {
	@Inject(GameService)
	private gameService!: GameService;

	private count = 0;

	@SubscribeConnection()
	handleConnection(client: Socket) {
		console.log(`Client connected: ${client.id}`);
		this.count++;
		console.log(`Total connected clients: ${this.count}`);
		client.data.username = `User${this.count}`;
		client.join("hub");
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
