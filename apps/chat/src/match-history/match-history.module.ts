import { Module } from 'my-fastify-decorators'
import { MatchHistoryController } from './match-history.controller.js'
import { MatchHistoryService } from './match-history.service.js'

@Module({
	controllers: [MatchHistoryController],
	providers: [MatchHistoryService],
})
export class MatchHistoryModule {}
