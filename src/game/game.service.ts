import { Service } from 'my-fastify-decorators';
import Pong from './pong/Game/Pong.js';

import { Socket } from 'socket.io';
import { create } from 'domain';

import { LEFT, RIGHT } from './pong/Player.js';

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
            client.emit("gameJoined", { gameId: game!.id, message: `Joined game ${game!.id} successfully!` });
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
                if (this.createGame(gameId, player1.data.userId, player2.data.userId)) {
                    this.connectPlayer(player1);
                    this.connectPlayer(player2);
                }
                /*player1.emit("gameJoined", { gameId, message: `Game ${gameId} created successfully! You are Player 1.` });
                player2.emit("gameJoined", { gameId, message: `Game ${gameId} created successfully! You are Player 2.` });*/
            }
        }
    }

    public createGame(id: string, player1Id: string, player2Id: string): boolean {
		if (this.gamesByPlayer.has(player1Id) || this.gamesByPlayer.has(player2Id)) {
			console.log(`One of the players is already in a game. Cannot create new game ${id}.`);
			return false;
		}
        const gameInstance = new Pong(id, player1Id, player2Id, this);
        this.gamesByPlayer.set(player1Id, gameInstance);
        this.gamesByPlayer.set(player2Id, gameInstance);
        this.games.set(id, gameInstance);
        gameInstance.initialize();
        console.log(`Game instance ${id} created with players ${player1Id} and ${player2Id}`);
		return true;
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

    public async processPlayerInput(client: Socket, data: any) {
        const game = this.gamesByPlayer.get(client.data.userId);
        if (game) {
            const player = (game.player1!.id === client.data.userId) ? game.player1! : game.player2!;
            switch (data.direction) {
                case LEFT:
                    player.setPaddleDirectionFromKeyboard(LEFT, data.isPressed);
                    break;
                case RIGHT:
                    player.setPaddleDirectionFromKeyboard(RIGHT, data.isPressed);
                    break;
            }
        }
    }
}
