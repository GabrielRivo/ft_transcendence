import { Controller, Get, Inject, Param } from 'my-fastify-decorators';
import { UserStatsService } from './user-stats.service.js';

@Controller('/stats')
export class UserStatsController {

	@Inject(UserStatsService)
	private chatService!: UserStatsService;

	@Get('/user_stats')
	async get_stats(@Param('userId') userId1: string) {
		const stats_log = await this.chatService.get_stats(Number(userId1));
		return stats_log;
	}
}