import { Module } from 'my-fastify-decorators';
import { BracketModule } from '../bracket/bracket.module.js';
import { ParticipantRepository } from '../participant/participant.repository.js';
import { ParticipantService } from '../participant/participant.service.js';
import { GameService } from '../services/game.service.js';
import { HistoryModule } from '../history/history.module.js';
import { OptionalAuthGuard } from '../guards/optional-auth.guard.js';
import { TournamentController } from './tournament.controller.js';
import { TournamentGateway } from './tournament.gateway.js';
import { TournamentService } from './tournament.service.js';
import { TournamentRepository } from './tournament.repository.js';

@Module({
	imports: [HistoryModule, BracketModule],
	controllers: [TournamentController],
	gateways: [TournamentGateway],
	providers: [
		TournamentRepository,
		TournamentService,
		ParticipantService,
		ParticipantRepository,
		GameService,
		OptionalAuthGuard,
	],
})
export class TournamentModule {}
