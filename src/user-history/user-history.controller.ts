import { Body, BodySchema, Controller, Get, Inject, Param, Post } from 'my-fastify-decorators';
import { EventPattern, Payload } from 'my-fastify-decorators-microservices';
import { CreateUserHistoryDto, CreateUserHistorySchema } from './dto/user-history.dto.js';
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
		console.log("Event user.created", event)
		this.userStatsService.registerUser(event.id);
	}

	@EventPattern('user.updated.username')
	async userUpdatedUsername(@Payload() event : { id : number, username : string}) {
		console.log('Event user Updated Username', event)
		this.userStatsService.updateUserName(event.id, event.username);
	}

	@EventPattern('game.finished')
	async handleGameFinished(@Payload() event: GameFinishedEvent) {
		console.log("Event launched", event)
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
				false
			);
		} catch (error) {
		console.error("Error while saving", error);
		}
	}
    
	// @Inject(RabbitMQClient)
	// private rabbitMq!= RabbitMQClient{}

	// @EventPattern('tournament.created')
    // async handleTournamentCreated(@Payload() data: TournamentCreatedPayload) {
    // console.log('[TournamentConsumer] Received tournament.created event:', data);

	@Post('/add')
	@BodySchema(CreateUserHistorySchema)
	add_match_to_history(@Body() data: CreateUserHistoryDto) {
		return this.userHistoryService.add_match_to_history(
			data.game_id,
			data.player1_id,
			data.player2_id,
			data.score_player1,
			data.score_player2,
			data.hit_player1,
			data.hit_player2,
			data.gain_player1,
			data.gain_player2,
			data.winner_id,
			data.duration_seconds,
			data.game_type,
			data.is_final,
		);
	}

	@Get('/user/:userId')
	getHistory(@Param('userId') userId: number) {
		// const is_empty = this.userHistoryService.get_user_matches(userId);
		// if (is_empty.length == 0) return [];
		return this.userHistoryService.get_user_matches(userId);
	}
}
