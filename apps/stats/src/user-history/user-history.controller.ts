import { Controller, Get, Inject, NotFoundException, Param } from 'my-fastify-decorators';
import { EventPattern, Payload } from 'my-fastify-decorators-microservices';
import { type GameFinishedEvent } from './game-finished.event.js';
import { UserHistoryService } from './user-history.service.js';
import { UserStatsService } from '../user-stats/user-stats.service.js'


@Controller('/match-history')
export class UserHistoryController {
    @Inject(UserHistoryService)
	private userHistoryService!: UserHistoryService;

	@Inject(UserStatsService)
	private userStatsService!: UserStatsService;
    
	@EventPattern('user.created')
	async userCreated(@Payload() event : { id : number}) {
		this.userStatsService.registerUser(event.id);
	}

	@EventPattern('user.updated.username')
	async userUpdatedUsername(@Payload() event : { id : number, username : string}) {
		this.userStatsService.updateUserName(event.id, event.username);
	}

	@EventPattern('user.deleted')
	async handleUserDeleted(@Payload() event: { id: number }) {
		this.userHistoryService.anonymizeGameHistory(event.id);
		this.userStatsService.removeUserStats(event.id);
	}

	@EventPattern('game.finished')
	async handleGameFinished(@Payload() event: GameFinishedEvent) {
		let gain1 = null
		let gain2 = null
		if (event.gameType == "ranked")
		{
			gain1 = await this.userHistoryService.calcElo(parseInt(event.player2Id), parseInt(event.player1Id), 
						event.score1, event.score2);
			gain2 = await this.userHistoryService.calcElo(parseInt(event.player2Id), parseInt(event.player1Id), 
						event.score2, event.score1);
		}
		try {
			await this.userHistoryService.add_match_to_history(
				event.gameId,
				parseInt(event.player1Id),
				parseInt(event.player2Id),
				event.score1,
				event.score2,
				event.hitPlayer1,
				event.hitPlayer2,
				gain1,
				gain2,
				parseInt(event.winnerId ?? "-1"),
				event.timestamp / 1000 * 60, 
				event.gameType,
				event.isTournamentFinal
			);
		} catch (error) { }
	}

	@Get('/user/:userId')
	getHistory(@Param('userId') userId: number) {
		if (this.userStatsService.isUser(userId) == false || userId == -1)
			throw new NotFoundException(`User "${userId}" not found`);
		return this.userHistoryService.get_user_matches(userId);
	}
}
