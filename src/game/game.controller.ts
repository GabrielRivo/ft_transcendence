import { Body, BodySchema, Controller, Inject, Post } from 'my-fastify-decorators';
import { GameService } from '@/game/game.service.js';
import { CreateGameSchema } from './game.dto.js';

@Controller('/game/pong')
export class GestionController {

	@Inject(GameService)
	private gameService!: GameService;


	@Post('/createGame')
	@BodySchema(CreateGameSchema)
	async createTestGame(@Body() data: any) {
		const player1Id = data.player1Id;
		const player2Id = data.player2Id;
		const gameId = data.gameId;
		const success = this.gameService.createGame(gameId, player1Id, player2Id);
		return { success };
	}
}
