import { Body, BodySchema, Controller, Get, Inject, Param, Post } from 'my-fastify-decorators';
import { CreateUserHistoryDto, CreateUserHistorySchema } from './dto/user-history.dto.js';
import { UserHistoryService } from './user-history.service.js';

@Controller('/match-history')
export class UserHistoryController {
	@Inject(UserHistoryService)
	private userHistoryService!: UserHistoryService;

	@Post('/add')
	@BodySchema(CreateUserHistorySchema)
	add_match_to_history(@Body() data: CreateUserHistoryDto) {
		return this.userHistoryService.add_match_to_history(
			data.game_id,
			data.player1_id,
			data.player2_id,
			data.score_player1,
			data.score_player2,
			data.winner_id,
			data.duration_seconds,
			data.game_type,
			data.tournament_id || null,
			data.is_final,
		);
	}

	@Get('/user/:userId')
	getHistory(@Param('userId') userId: number) {
		const is_empty = this.userHistoryService.get_user_matches(userId);
		if (is_empty.length == 0) return { message: 'empty history' };
		return this.userHistoryService.get_user_matches(userId);
	}
}
