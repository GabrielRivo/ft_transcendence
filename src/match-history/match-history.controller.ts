import { Body, BodySchema, Controller, Inject, Post, Get, Param } from 'my-fastify-decorators';
import { MatchHistoryService } from './match-history.service.js';
import {  AddMatchToHistorySchema, AddMatchToHistoryDto } from './dto/MatchHistory.dto.js';

@Controller('/match-history')
export class MatchHistoryController {

	@Inject(MatchHistoryService)
	private match_history_managementService!: MatchHistoryService

	@Post('/')
	@BodySchema(AddMatchToHistorySchema)
	add_match_to_history(@Body() data: AddMatchToHistoryDto) {

		return this.match_history_managementService.add_match_to_history(
			data.userId1, 
			data.userId2, 
			data.scoreUser1, 
			data.scoreUser2
		);
		// return this.match_history_managementService.add_match_to_history(data.userId1, data.userId2, 
		// 		data.scoreUser1, data.scoreUser2)
	}

	@Get('/:userId')
	getHistory(@Param('userId') userId: number) {
		return this.match_history_managementService.get_user_matches(userId);
	}
	// @Delete('/match_history') // necessaire? -> non, mais penser a delete + de 20 parties dans l'affichage de l'historique
	// @BodySchema(AddMatchToHistorySchema) // db time serie => oti pour l'historique 
	// delete_match_from_history(@Body() data : AddMatchToHistoryDto){
	// 	return this.match_history_managementService.delete_match_from_history(data.userId1, data.userId2, 
	// 			data.scoreUser1, data.scoreUser2)
	// }
}