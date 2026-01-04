import { Service } from 'my-fastify-decorators';
import Pong from './pong/Game/Pong.js';

import { Socket } from 'socket.io';
import { create } from 'domain';

@Service()
export class GameService {
    private gameCount = 0;
    private gamesByPlayer: Map<string, Pong> = new Map();
    private games: Map<string, Pong> = new Map();
    private queue: Socket[] = [];

    public connectPlayer(client: Socket) {
        if (this.gamesByPlayer.has(client.data.userId)) {
            const game = this.gamesByPlayer.get(client.data.userId);
            game!.playerConnected(client);
            client.emit("gameJoined", { gameId: game!.id, message: `Rejoined game ${game!.id} successfully!` });
            console.log(`Client ${client.id} joined game ${game!.id}`);
        }
        else {
            this.queue.push(client);
			//attend 15 sec, si le joueur est toujours dans la queue, le retirer
			setTimeout(() => {
				if (this.queue.includes(client)) {
					this.queue = this.queue.filter(c => c !== client);
					console.log(`Client ${client.id} removed from queue due to timeout. Queue length: ${this.queue.length}`);
					client.emit("queueTimeout", { message: "You have been removed from the queue due to inactivity." });
				}
            }, 15000);
            console.log(`Client ${client.id} added to queue. Queue length: ${this.queue.length}`);
            if (this.queue.length >= 2) {
                const player1 = this.queue.shift()!;
                const player2 = this.queue.shift()!;
                const gameId = `game-${this.gameCount++}`;
                this.createGame(gameId, player1, player2);
                player1.emit("gameJoined", { gameId, message: `Game ${gameId} created successfully! You are Player 1.` });
                player2.emit("gameJoined", { gameId, message: `Game ${gameId} created successfully! You are Player 2.` });
            }
        }
    }

    public createGame(id: string, player1: Socket, player2: Socket) {
        const gameInstance = new Pong(id, player1, player2, this);
        this.gamesByPlayer.set(player1.data.userId, gameInstance);
        this.gamesByPlayer.set(player2.data.userId, gameInstance);
        this.games.set(id, gameInstance);
        gameInstance.initialize();
        console.log(`Game instance ${id} created with players ${player1.data.userId} and ${player2.data.userId}`);
        gameInstance.playerConnected(player1);
        gameInstance.playerConnected(player2);
    }

    public disconnectPlayer(client: Socket) {
        if (this.queue.includes(client)) {
            this.queue = this.queue.filter(c => c !== client);
            console.log(`Client ${client.id} removed from queue. Queue length: ${this.queue.length}`);
        }
        else
        {
            const game = this.gamesByPlayer.get(client.data.userId);
            if (game) {
                game.playerDisconnected(client);
            }
        }
    }

    public removeGame(game: Pong, player1Id: string, player2Id: string) {
        this.gamesByPlayer.delete(player1Id);
        this.gamesByPlayer.delete(player2Id);
        this.games.delete(game.id);
        console.log(`Game instance with players ${player1Id} and ${player2Id} ended and removed.`);
		this.gameCount--;
    }

    public getActiveGamesCount(): number {
        console.log(this.games);
        console.log(this.gamesByPlayer);
        return this.games.size;
    }
}
