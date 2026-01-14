import { Module } from 'my-fastify-decorators';
import { UserHistoryModule } from './user-history/user-history.module.js';
import { UserStatsModule } from './user-stats/user-stats.module.js';

@Module({
	imports: [UserHistoryModule, UserStatsModule],
})
export class AppModule {}
