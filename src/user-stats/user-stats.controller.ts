import {
	BadRequestException,
	Body,
	BodySchema,
	Controller,
	Get,
	Inject,
	Param,
	Post,
} from 'my-fastify-decorators';

import { UserHistoryService } from '../user-history/user-history.service.js';
import { CreateGameStatDto, CreateGameStatSchema } from './dto/user-stats.dto.js';
import { UserStatsService } from './user-stats.service.js';

@Controller('/')
export class UserStatsController {
	@Inject(UserHistoryService)
	private userHistoryService!: UserHistoryService;

	@Inject(UserStatsService)
	private statsService!: UserStatsService;

	@Get('/user/:userId')
	async get_stats(@Param('userId') userId: string) {
		try {
			const stats_log = await this.statsService.getGlobalStats(Number(userId));
			if (!stats_log) return { message: "User doesn't have stats" };
			return stats_log;
		} catch (err) {
			console.error('Erreur GET stats:', err);
			return { message: 'Error' };
		}
	}

	@Get('/all-elos')
	getAllElos() {
		return this.statsService.getAllElos();
	}

	// @Post('/add')
	// @BodySchema(CreateGameStatSchema)
	// async addMatch(@Body() data: CreateGameStatDto) {
	// 	try {
	// 		return this.userHistoryService.add_match_to_history(
	// 			data.game_id,
	// 			data.player1_id,
	// 			data.player2_id,
	// 			data.score_player1,
	// 			data.score_player2,
	// 			data.hit_player1,
	// 			data.hit_player2,
	// 			data.winner_id,
	// 			data.duration_seconds,
	// 			data.game_type,
	// 		);
	// 	} catch (err) {
	// 		if (err instanceof BadRequestException) throw err;
	// 		return { message: "Can't register match" };
	// 	}
	// }
}
