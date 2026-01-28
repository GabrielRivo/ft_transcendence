// ============================================================================
// GameGateway - WebSocket Gateway for Pong Game Connections
// ============================================================================
// Handles WebSocket connections for real-time Pong gameplay.
//
// Responsibilities:
// - Authenticating players via JWT in handshake
// - Routing connections to the GameService
// - Managing player socket lifecycle
// - Forwarding player input to active games
//
// Connection Flow:
// 1. Player receives gameId from Matchmaking Service (match_confirmed event)
// 2. Player connects to this gateway with JWT token in handshake auth
// 3. Gateway validates JWT and extracts userId
// 4. Gateway checks if player has a pending game via GameService
// 5. If player has a pending game, they join it
// 6. If no pending game, connection is rejected with error
//
// Security:
// - JWT token is required in handshake (auth.token, query.token, or Authorization header)
// - JWT payload is extracted and validated (must contain valid user id)
// - Players can only connect if they have a game created for them by Matchmaking
// - This prevents unauthorized game access and userId spoofing
//
// Token Sources (in order of priority):
// 1. socket.handshake.auth.token - Recommended, set via Socket.IO client auth option
// 2. socket.handshake.query.token - Fallback for query string
// 3. socket.handshake.headers.authorization - Fallback for Authorization header
// ============================================================================

import {
	Inject,
	SubscribeConnection,
	SubscribeDisconnection,
	SubscribeMessage,
	WebSocketGateway,
	ConnectedSocket,
	MessageBody,
	JWTBody,
	BodySchema,
} from 'my-fastify-decorators';
import { Socket } from 'socket.io';
import { GameService } from './game.service.js';
import { GameConnectionError, type JwtPayload } from './types.js';
import { PlayerInputDto, PlayerInputSchema } from "./game.dto.js";

/**
 * Extended Socket type with typed data property for game sessions.
 */
interface GameSocket extends Socket {
	data: {
		/** User ID extracted from JWT, stored for later use */
		userId?: string;
	};
}

@WebSocketGateway()
export class GameGateway {
	@Inject(GameService)
	private gameService!: GameService;

	/** Maps user IDs to their active sockets (for reconnection handling) */
	private playerSockets: Map<string, GameSocket> = new Map();

	/** Total connected clients counter (for monitoring) */
	private connectedCount = 0;

	// =========================================================================
	// Connection Lifecycle
	// =========================================================================

	/**
	 * Handles new WebSocket connections with JWT authentication.
	 *
	 * This method performs secure authentication by:
	 * 1. Extracting JWT payload via @JWTBody decorator
	 * 2. Validating the JWT payload contains a valid user ID
	 * 3. Checking if the player has a pending game in GameService
	 * 4. Connecting the player to their game or rejecting the connection
	 *
	 * Security Considerations:
	 * - The @JWTBody decorator extracts the payload from the handshake token
	 * - We validate that the JWT contains a valid numeric user ID
	 * - The userId is converted to string for internal service compatibility
	 * - Connection is rejected if no valid JWT or no pending game
	 *
	 * @param client - The connecting Socket.IO client
	 * @param user - JWT payload extracted from handshake auth token
	 */
	@SubscribeConnection()
	handleConnection(
		@ConnectedSocket() client: GameSocket,
		@JWTBody() user: JwtPayload | undefined,
	): void {
		const socketId = client.id;

		// =====================================================================
		// Step 1: Validate JWT Payload
		// =====================================================================
		// The @JWTBody decorator extracts the token from:
		// - socket.handshake.auth.token (recommended)
		// - socket.handshake.query.token (fallback)
		// - socket.handshake.headers.authorization (fallback)
		//
		// If no token is found or parsing fails, user will be undefined.
		// We also validate that the id field is a positive number.
		// =====================================================================

		if (!user || typeof user.id !== 'number' || user.id <= 0) {
			console.warn(
				`[GameGateway] Connection rejected: Missing or invalid JWT payload | SocketId: ${socketId}`,
				{
					receivedPayload: user ? { id: user.id, hasUsername: !!user.username } : 'null',
				},
			);

			client.emit('error', {
				code: user ? GameConnectionError.INVALID_TOKEN : GameConnectionError.AUTH_REQUIRED,
				message: user
					? 'Invalid JWT token: user ID is missing or invalid'
					: 'Authentication required. Please provide a valid JWT token in handshake auth.',
			});

			client.disconnect(true);
			return;
		}

		// =====================================================================
		// Step 2: Extract and Store User ID
		// =====================================================================
		// Convert numeric ID to string for internal service compatibility.
		// All internal services (GameService) expect string IDs.
		// Store userId in socket.data for use in message handlers and disconnect.
		// =====================================================================

		const userId = String(user.id);
		client.data.userId = userId;

		console.log(
			`[GameGateway] Client ${socketId} authenticated | UserId: ${userId} | Username: ${user.username || 'N/A'}`,
		);

		this.connectedCount++;

		// =====================================================================
		// Step 3: Handle Reconnection
		// =====================================================================
		// If player is already connected with a different socket, disconnect
		// the old socket first. This ensures only one socket per player.
		// =====================================================================

		const existingSocket = this.playerSockets.get(userId);
		if (existingSocket) {
			console.log(
				`[GameGateway] Reconnection detected for userId ${userId}. ` +
					`Disconnecting old socket ${existingSocket.id}`,
			);
			existingSocket.disconnect(true);
		}

		// Register this socket for the player
		this.playerSockets.set(userId, client);

		// =====================================================================
		// Step 4: Connect Player to Their Pending Game
		// =====================================================================
		// The GameService checks if the player has a game created for them by
		// the Matchmaking Service. If not, the connection is rejected.
		// This ensures players can only join games they are authorized for.
		// =====================================================================

		const result = this.gameService.connectPlayer(client);

		if (result.success) {
			// Player successfully connected to their game
			console.log(`[GameGateway] Player ${userId} connected to game ${result.gameId}`);

			// IMPORTANT: Use 'game_connected' instead of 'connection' because
			// 'connection' is a reserved Socket.IO event name and would not
			// be delivered correctly to the client's event handlers.
			client.emit('game_connected', {
				status: 'connected',
				gameId: result.gameId,
				message: `Connected to game ${result.gameId}. Waiting for game to start...`,
			})
		} else {
			// No pending game - inform client and disconnect
			console.log(`[GameGateway] Connection rejected for userId ${userId}: ${result.error}`);

			client.emit('error', {
				code: result.error,
				message: result.message,
			});

			// Clean up and disconnect
			this.playerSockets.delete(userId);
			this.connectedCount--;
			client.disconnect(true);
		}
	}

	/**
	 * Handles client disconnections.
	 *
	 * Notifies the GameService to handle game-level disconnect logic
	 * (e.g., pausing game, starting reconnection timeout).
	 *
	 * @param client - The disconnecting Socket.IO client
	 */
	@SubscribeDisconnection()
	handleDisconnect(@ConnectedSocket() client: GameSocket): void {
		const userId = client.data.userId;

		if (userId) {
			// Only remove from map if this is still the active socket for this user
			// (prevents issues with rapid reconnections)
			if (this.playerSockets.get(userId) === client) {
				this.playerSockets.delete(userId);
			}

			// Notify game service of disconnection
			this.gameService.disconnectPlayer(client);
		}

		this.connectedCount--;
		console.log(
			`[GameGateway] Client ${client.id} (userId: ${userId || 'unknown'}) disconnected. ` +
				`Total connected: ${this.connectedCount}`,
		);
	}

	// =========================================================================
	// Game Messages
	// =========================================================================

	/**
	 * Handles player input messages.
	 *
	 * Input data typically includes:
	 * - direction: Movement direction (-1, 0, 1)
	 * - timestamp: Client timestamp for lag compensation
	 *
	 * Note: The player's userId is already validated during connection.
	 * Input is only processed if the player is authenticated and in a game.
	 *
	 * @param client - The client sending input
	 * @param data - Input payload (movement direction, actions, etc.)
	 */
	@SubscribeMessage('playerDirection')
	@BodySchema(PlayerInputSchema)
	handlePlayerInput(@ConnectedSocket() client: GameSocket, @MessageBody() data: PlayerInputDto): void {
		// Forward input to game service
		this.gameService.onPlayerInput(client, data);
	}

	/**
	 * Handles ping messages for latency measurement.
	 *
	 * Client can measure round-trip time by timing ping-pong.
	 *
	 * @param client - The client sending ping
	 */
	@SubscribeMessage('ping')
	handlePing(@ConnectedSocket() client: GameSocket): void {
		client.emit('pong');
	}

	// =========================================================================
	// Utility Methods (For Testing and Monitoring)
	// =========================================================================

	/**
	 * Returns the number of currently connected clients.
	 * Useful for monitoring and debugging.
	 */
	public getConnectedCount(): number {
		return this.connectedCount;
	}

	/**
	 * Checks if a player has an active socket connection.
	 *
	 * @param userId - The player's user ID
	 * @returns true if player has an active socket
	 */
	public isPlayerConnected(userId: string): boolean {
		return this.playerSockets.has(userId);
	}
}
