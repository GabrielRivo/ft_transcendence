import { Controller, Get, Inject, JWTBody, Param } from 'my-fastify-decorators';


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
		try {
			const stats_log = await this.statsService.getGlobalStats(Number(userId));
			if (!stats_log) return {
					elo: 1000,
					total_games: 0,
					wins: 0,
					losses: 0,
					winrate: null,
					tournament_played: 0,
					tournament_won: 0,
					average_score: 0,
					average_game_duration_in_seconde: 0,
			}
				//message: "User doesn't have stats" };
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

	@Get('/user/small/:userId')
	async get_small_stats(@Param('userId') userId: string) {
		try {
		const stats_log = await this.statsService.getGlobalStats(Number(userId));
		if (!stats_log) return {
				elo: 1000,
				total_games: 0,
				wins: 0,
				losses: 0,
				winrate: null,
		}
		return stats_log;
		} catch (err) {
			console.error('Erreur GET stats:', err);
			return { message: 'Error' };
		}
	}

}

