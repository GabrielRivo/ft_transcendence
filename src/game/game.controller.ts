// ============================================================================
// GameController - HTTP REST API for Game Management
// ============================================================================
// Provides HTTP endpoints for game creation and management.
//
// Routes:
// - POST /games         - Create a new game (used by Matchmaking Service)
// - POST /createGame    - Legacy endpoint (deprecated)
//
// Main consumers:
// - Matchmaking Service: Creates games after match confirmation (HTTP)
// - Admin/Testing: Manual game creation endpoints
//
// External access (via NGINX):
// - /api/game/games -> rewritten to /games -> this controller
//
// Internal access (service-to-service):
// - http://game:3000/games -> this controller directly
//
// All endpoints use JSON Schema validation via my-fastify-decorators.
// ============================================================================

import {
	Body,
	BodySchema,
	Controller,
	Inject,
	Post,
	Get,
	Res,
	JWTBody,
	UnauthorizedException,
	ResponseSchema,
} from 'my-fastify-decorators';
import type { FastifyReply } from 'fastify';

import { GameService } from './game.service.js';
import {
	CreateGameDto,
	CreateGameSchema,
	type CreateGameResponseDto,
	type CreateGameErrorDto,
} from './game.dto.js';

@Controller('/games')
export class GameController {
	@Inject(GameService)
	private gameService!: GameService;

	/**
	 * POST /games - Create a new Pong game instance
	 *
	 * This endpoint is called by the Matchmaking Service after both players
	 * have confirmed their readiness (ready-check phase).
	 *
	 * Request Flow:
	 * 1. Matchmaking finds compatible players
	 * 2. Both players accept the match
	 * 3. Matchmaking calls this endpoint with gameId + player IDs
	 * 4. Game instance is created and ready for WebSocket connections
	 * 5. Matchmaking sends 'match_confirmed' to players with gameId
	 * 6. Players connect to Game Gateway WebSocket with gameId
	 *
	 * Success Response (201 Created):
	 * {
	 *   "success": true,
	 *   "gameId": "match-abc123",
	 *   "message": "Game created successfully"
	 * }
	 *
	 * Error Response (409 Conflict):
	 * {
	 *   "success": false,
	 *   "error": "PLAYER_ALREADY_IN_GAME",
	 *   "message": "Player 42 is already in an active game"
	 * }
	 *
	 * @param dto - Game creation parameters (gameId, player1Id, player2Id, type)
	 * @param res - Fastify response object for setting status codes
	 * @returns CreateGameResponseDto | CreateGameErrorDto
	 *
	 * @throws ConflictException - When game already exists or player is in a game
	 */
	@Post('/')
	@BodySchema(CreateGameSchema)
	async createGame(
		@Body() dto: CreateGameDto,
		@Res() res: FastifyReply,
	): Promise<CreateGameResponseDto | CreateGameErrorDto> {
		console.log(
			`[GameController] Received game creation request: gameId=${dto.gameId}, player1=${dto.player1Id}, player2=${dto.player2Id}`,
		);

		// Attempt to create the game
		const result = this.gameService.createGame(dto.gameId, dto.player1Id, dto.player2Id, dto.type);

		// Handle success - return 201 Created
		if (result.success) {
			console.log(`[GameController] Game ${result.gameId} created successfully`);

			res.status(201);
			return {
				success: true,
				gameId: result.gameId,
				message: 'Game created successfully',
			};
		}

		// Handle failure - return 409 Conflict with specific error code
		console.warn(
			`[GameController] Failed to create game ${dto.gameId}: ${result.error} - ${result.message}`,
		);

		res.status(409);
		return {
			success: false,
			error: result.error,
			message: result.message,
		};
	}

	@Get('/active')
	@ResponseSchema(200, {
		type: 'object',
		properties: {
			gameId: { type: 'string' },
		},
	})
	async getActiveGame(@JWTBody() user: any) {
		if (!user) throw new UnauthorizedException();
		const result = this.gameService.getActiveGame(String(user.id));
		return result || {};
	}

	@Post('/surrender')
	async surrenderGame(@JWTBody() user: any) {
		if (!user) throw new UnauthorizedException();
		const result = this.gameService.surrenderGame(String(user.id));
		return result;
	}
}
