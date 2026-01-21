import { Module } from 'my-fastify-decorators';
import { TournamentController } from './infrastructure/controllers/tournament.controller.js';
import { TournamentGateway } from './infrastructure/gateways/tournament.gateway.js';
import { CancelTournamentUseCase } from './application/use-cases/cancel-tournament.use-case.js';
import { CreateTournamentUseCase } from './application/use-cases/create-tournament.use-case.js';
import { GetTournamentUseCase } from './application/use-cases/get-tournament.use-case.js';
import { ListTournamentsUseCase } from './application/use-cases/list-tournaments.use-case.js';
import { SqliteTournamentRepository } from './infrastructure/repositories/sqlite-tournament.repository.js';

@Module({
    controllers: [TournamentController],
    gateways: [TournamentGateway],
    providers: [
        CancelTournamentUseCase,
        CreateTournamentUseCase,
        GetTournamentUseCase,
        ListTournamentsUseCase,
        SqliteTournamentRepository,
    ]
})
export class TournamentModule {}