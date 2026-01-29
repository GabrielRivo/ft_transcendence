import { Service } from 'my-fastify-decorators';
import Pong from './pong/Game/Pong.js';
import { GameType } from './game.dto.js';
import { GameFinishedEvent } from './game.events.js';

import { Socket } from 'socket.io';
import { Inject } from 'my-fastify-decorators';
import { GameEventsPublisher } from './infrastructure/publishers/game-events.publisher.js';

/**
 * Result type for game creation operations.
 * Provides detailed feedback for the API layer.
 */
export type CreateGameResult =
	| { success: true; gameId: string }
	| { success: false; error: 'GAME_ALREADY_EXISTS' | 'PLAYER_ALREADY_IN_GAME'; message: string };

/**
 * Result type for player connection operations.
 * Used by the Gateway to determine appropriate response to the client.
 *
 * Error codes align with GameConnectionError enum from types.ts for consistency.
 */
export type ConnectPlayerResult =
	| { success: true; gameId: string }
	| { success: false; error: 'NO_PENDING_GAME' | 'INVALID_USER_ID'; message: string };

@Service()
export class GameService {
	private gameCount = 0;
	private gamesByPlayer: Map<string, Pong> = new Map();
	private games: Map<string, Pong> = new Map();

	@Inject(GameEventsPublisher)
	private eventsPublisher!: GameEventsPublisher;

	public getActiveGame(userId: string): { gameId: string } | null {
		const game = this.gamesByPlayer.get(userId);
		return game ? { gameId: game.id } : null;
	}

	public surrenderGame(userId: string): { success: boolean; message: string } {
		const game = this.gamesByPlayer.get(userId);
		if (!game) {
			return { success: false, message: 'No active game found' };
		}

		const opponentId = game.player1?.id === userId ? game.player2?.id : game.player1?.id;
		if (!opponentId) {
			return { success: false, message: 'Opponent not found' };
		}

		game.endGame('surrender', opponentId);
		return { success: true, message: 'Game surrendered' };
	}

	public connectPlayer(client: Socket): ConnectPlayerResult {
		const userId = client.data.userId;

		if (!userId || typeof userId !== 'string') {
			return {
				success: false,
				error: 'INVALID_USER_ID',
				message: 'User ID is required to connect to a game',
			};
		}

		// Check if player has a pending/active game
		const game = this.gamesByPlayer.get(userId);

		if (!game) {
			return {
				success: false,
				error: 'NO_PENDING_GAME',
				message: 'No pending game found. Please join matchmaking queue first.',
			};
		}

		// Player has a valid game - connect them
		game.playerConnected(client);
		return {
			success: true,
			gameId: game.id,
		};
	}

	public disconnectPlayer(client: Socket): void {
		const userId = client.data.userId;

		if (!userId) {
			return;
		}

		const game = this.gamesByPlayer.get(userId);

		if (game) {
			game.playerDisconnected(client);
		}
	}

	public createGame(id: string, player1Id: string, player2Id: string, type: GameType, tournamentId?: string, isFinal?: boolean): CreateGameResult {
		// Validate that neither player is already in an active game
		if (this.gamesByPlayer.has(player1Id)) {
			return {
				success: false,
				error: 'PLAYER_ALREADY_IN_GAME',
				message: `Player ${player1Id} is already in an active game`,
			};
		}

		if (this.gamesByPlayer.has(player2Id)) {
			return {
				success: false,
				error: 'PLAYER_ALREADY_IN_GAME',
				message: `Player ${player2Id} is already in an active game`,
			};
		}

		// Validate that game ID is unique
		if (this.games.has(id)) {
			return {
				success: false,
				error: 'GAME_ALREADY_EXISTS',
				message: `Game with ID ${id} already exists`,
			};
		}

		// Create and initialize the game instance
		const gameInstance = new Pong(id, player1Id, player2Id, type, this, tournamentId, isFinal);

		// Register game in tracking maps
		this.gamesByPlayer.set(player1Id, gameInstance);
		this.gamesByPlayer.set(player2Id, gameInstance);
		this.games.set(id, gameInstance);

		// Initialize game physics and state
		gameInstance.initialize();

		// Increment counter for metrics/debugging
		this.gameCount++;

		return { success: true, gameId: id };
	}

	public async removeGame(
		game: Pong,
		player1Id: string,
		player2Id: string/*,
		result?: {
			score1: number;
			score2: number;
			winnerId: string | null;
			reason: 'score_limit' | 'surrender' | 'disconnection' | 'timeout';
		},*/
	): Promise<void> {
		this.gamesByPlayer.delete(player1Id);
		this.gamesByPlayer.delete(player2Id);
		this.games.delete(game.id);
		this.gameCount--;

		/*if (result) {
			await this.eventsPublisher.publishGameFinished({
				eventName: 'game.finished',
				gameId: game.id,
				player1Id,
				player2Id,
				score1: result.score1,
				score2: result.score2,
				winnerId: result.winnerId,
				reason: result.reason,
				timestamp: Date.now(),
			});
		}*/
	}

	public getActiveGamesCount(): number {
		return this.games.size;
	}

	public async publishGameFinished(gameFinishedEvent: GameFinishedEvent): Promise<void> {
		await this.eventsPublisher.publishGameFinished(gameFinishedEvent);
	}

	public async publishScoreUpdate(gameId: string, player1Id: string, player2Id: string, score1: number, score2: number) {
		await this.eventsPublisher.publishScoreUpdated({
			eventName: 'game.score_updated',
			gameId,
			player1Id,
			player2Id,
			score1,
			score2,
			timestamp: Date.now(),
		});
	}

	public async onPlayerInput(client: Socket, data: any): Promise<void> {
		const game = this.gamesByPlayer.get(client.data.userId);
		if (game && game.inputManager) {
			game.inputManager.recordInput(client, data);
		}
	}
}
