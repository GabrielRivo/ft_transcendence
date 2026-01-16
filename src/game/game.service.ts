import { Service } from 'my-fastify-decorators';
import Pong from './pong/Game/Pong.js';

import { Socket } from 'socket.io';

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
    private queue: Socket[] = [];

    public connectPlayer(client: Socket): ConnectPlayerResult {
		const userId = client.data.userId;

		// Validate that userId is present (should be set by Gateway after auth)
		if (!userId || typeof userId !== 'string') {
			console.warn(`[GameService] Connection rejected: Invalid userId for socket ${client.id}`);
			return {
				success: false,
				error: 'INVALID_USER_ID',
				message: 'User ID is required to connect to a game',
			};
		}

		// Check if player has a pending/active game
		const game = this.gamesByPlayer.get(userId);

		if (!game) {
			console.log(
				`[GameService] Connection rejected: No pending game for user ${userId}. ` +
					'Player must use Matchmaking Service first.',
			);
			return {
				success: false,
				error: 'NO_PENDING_GAME',
				message: 'No pending game found. Please join matchmaking queue first.',
			};
		}

		// Player has a valid game - connect them
		game.playerConnected(client);
		console.log(`[GameService] Player ${userId} connected to game ${game.id}`);

		return {
			success: true,
			gameId: game.id,
		};
	}

    public disconnectPlayer(client: Socket): void {
		const userId = client.data.userId;

		if (!userId) {
			console.log(`[GameService] Disconnect ignored: No userId on socket ${client.id}`);
			return;
		}

		const game = this.gamesByPlayer.get(userId);

		if (game) {
			game.playerDisconnected(client);
			console.log(`[GameService] Player ${userId} disconnected from game ${game.id}`);
		} else {
			console.log(`[GameService] Disconnect: Player ${userId} was not in any active game`);
		}
	}

    public createGame(id: string, player1Id: string, player2Id: string): CreateGameResult {
		// Validate that neither player is already in an active game
		if (this.gamesByPlayer.has(player1Id)) {
			console.log(
				`[GameService] Cannot create game ${id}: Player ${player1Id} is already in a game.`,
			);
			return {
				success: false,
				error: 'PLAYER_ALREADY_IN_GAME',
				message: `Player ${player1Id} is already in an active game`,
			};
		}

		if (this.gamesByPlayer.has(player2Id)) {
			console.log(
				`[GameService] Cannot create game ${id}: Player ${player2Id} is already in a game.`,
			);
			return {
				success: false,
				error: 'PLAYER_ALREADY_IN_GAME',
				message: `Player ${player2Id} is already in an active game`,
			};
		}

		// Validate that game ID is unique
		if (this.games.has(id)) {
			console.log(`[GameService] Cannot create game ${id}: Game ID already exists.`);
			return {
				success: false,
				error: 'GAME_ALREADY_EXISTS',
				message: `Game with ID ${id} already exists`,
			};
		}

		// Create and initialize the game instance
		const gameInstance = new Pong(id, player1Id, player2Id, this);

		// Register game in tracking maps
		this.gamesByPlayer.set(player1Id, gameInstance);
		this.gamesByPlayer.set(player2Id, gameInstance);
		this.games.set(id, gameInstance);

		// Initialize game physics and state
		gameInstance.initialize();

		// Increment counter for metrics/debugging
		this.gameCount++;

		console.log(`[GameService] Game ${id} created with players ${player1Id} and ${player2Id}`);

		return { success: true, gameId: id };
	}

    public removeGame(game: Pong, player1Id: string, player2Id: string): void {
		this.gamesByPlayer.delete(player1Id);
		this.gamesByPlayer.delete(player2Id);
		this.games.delete(game.id);
		this.gameCount--;

		console.log(
			`[GameService] Game ${game.id} removed. Players ${player1Id} and ${player2Id} are now free.`,
		);
	}

    public getActiveGamesCount(): number {
		return this.games.size;
	}

    public async onPlayerInput(client: Socket, data: any): Promise<void> {
		const game = this.gamesByPlayer.get(client.data.userId);
		console.log(`[GameService] Received input from player ${client.data.userId} : `, data);
		if (game && game.inputManager) {
			game.inputManager.recordInput(client, data);
		}
	}
}
