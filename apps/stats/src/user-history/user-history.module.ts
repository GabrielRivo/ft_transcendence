import { Module } from 'my-fastify-decorators'
import { UserStatsModule } from '../user-stats/user-stats.module.js'
import { UserHistoryController } from './user-history.controller.js'
import { UserHistoryService } from './user-history.service.js'

@Module({
	imports: [UserStatsModule],
	controllers: [UserHistoryController],
	providers: [UserHistoryService],
})
export class UserHistoryModule {}
