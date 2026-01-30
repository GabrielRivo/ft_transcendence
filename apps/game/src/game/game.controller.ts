// ============================================================================
// GameController - HTTP REST API for Game Management
// ============================================================================
// Provides HTTP endpoints for game management.
//
// Routes:
// - GET  /games/active    - Get active game for current user
// - POST /games/surrender - Surrender current game
//
// Note: Game creation is now handled via RabbitMQ events (see game-events.controller.ts)
// ============================================================================

import {
	Controller,
	Inject,
	Post,
	Get,
	JWTBody,
	UnauthorizedException,
	ResponseSchema,
} from 'my-fastify-decorators';

import { GameService } from './game.service.js';

@Controller('/games')
export class GameController {
	@Inject(GameService)
	private gameService!: GameService;

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
