import { Controller, Get, Inject, NotFoundException, Param } from 'my-fastify-decorators';


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
	async get_stats(@Param('userId') userId: number) {
		if (this.statsService.isUser(userId) == false || userId == -1) 
			throw new NotFoundException(`User "${userId}" not found`);
		return await this.statsService.getGlobalStats(userId);
	}

	@Get('/all-elos')
	getAllElos() {
		return this.statsService.getAllElos();
	}

	@Get('/elo/:userId')
	async get_elo(@Param('userId') userId: number) {
		if (this.statsService.isUser(userId) == false || userId == -1) 
			throw new NotFoundException(`User "${userId}" not found`);
		return await this.statsService.getUserElo(userId);
	}

	@Get('/user/small/:userId')
	async get_small_stats(@Param('userId') userId: number) {
		if (this.statsService.isUser(userId) == false || userId == -1) 
			throw new NotFoundException(`User "${userId}" not found`);
		return await this.statsService.getGlobalStats(userId);
	}

}

