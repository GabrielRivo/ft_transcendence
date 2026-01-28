import { BadRequestException, Controller, Get, Inject, JWTBody, Param } from 'my-fastify-decorators';


export interface UserStatsValues {
	user_id: number;
	elo: number;
	total_games: number;
	wins: number;
	losses: number;
	winrate: number | null;
	tournament_played: number;
	tournament_won: number;
	average_score: number;
	average_game_duration_in_seconde: number;
}

import { UserStatsService } from './user-stats.service.js';

@Controller('/')
export class UserStatsController { 
	@Inject(UserStatsService)
	private statsService!: UserStatsService;

	@Get('/user/:userId')
	async get_stats(@Param('userId') userId: string) {
		return await this.statsService.getGlobalStats(Number(userId));
	}

	@Get('/all-elos')
	getAllElos() {
		return this.statsService.getAllElos();
	}

	@Get('/elo/:userId')
	async get_elo(@Param('userId') userId: string) {
		return await this.statsService.getGlobalStats(Number(userId));
	}

	@Get('/user/small/:userId')
	async get_small_stats(@Param('userId') userId: string) {
			return await this.statsService.getGlobalStats(Number(userId));
	}

}

