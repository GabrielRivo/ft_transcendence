import { Module } from 'my-fastify-decorators';
import { HealthController } from './health.controller.js';
import { TournamentModule } from './tournament/tournament.module.js';

@Module({
	// providers: [TournamentModule],
	imports: [TournamentModule],
	controllers: [HealthController],
})
export class AppModule { }
