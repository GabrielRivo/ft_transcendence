import { Module } from 'my-fastify-decorators';
import { TournamentController } from './infrastructure/controllers/tournament.controller.js';
import { TournamentGateway } from './infrastructure/gateways/tournament.gateway.js';
import { CancelTournamentUseCase } from './application/use-cases/cancel-tournament.use-case.js';
import { CreateTournamentUseCase } from './application/use-cases/create-tournament.use-case.js';
import { GetTournamentUseCase } from './application/use-cases/get-tournament.use-case.js';
import { SqliteTournamentRepository } from './infrastructure/repositories/sqlite-tournament.repository.js';
import { SocketTournamentEventsPublisher } from './infrastructure/publishers/socket-tournament-events.publisher.js';
import { RabbitMQTournamentEventsPublisher } from './infrastructure/publishers/rabbitmq-tournament-events.publisher.js';
import { CompositeTournamentEventsPublisher } from './infrastructure/publishers/composite-tournament-events.publisher.js';
import { JoinTournamentUseCase } from './application/use-cases/join-tournament.use-case.js';
import { StartRoundUseCase } from './application/use-cases/start-round.use-case.js';
import { GetActiveTournamentUseCase } from './application/use-cases/active-tournament.use-case.js';
import { LeaveTournamentUseCase } from './application/use-cases/leave-tournament.use-case.js';
import { RabbitMqGameGateway } from './infrastructure/gateways/http-game.gateway.js';
import { TimerAdapter } from './infrastructure/adapters/timer.adapter.js';
import { TournamentEventsController } from './infrastructure/controllers/tournament-events.controller.js';
import { LiveScoreService } from './infrastructure/services/live-score.service.js';

@Module({
    controllers: [TournamentController, TournamentEventsController],
    gateways: [TournamentGateway],
    providers: [
        SqliteTournamentRepository,
        SocketTournamentEventsPublisher,
        RabbitMQTournamentEventsPublisher,
        CompositeTournamentEventsPublisher,
        CancelTournamentUseCase,
        CreateTournamentUseCase,
        GetTournamentUseCase,
        JoinTournamentUseCase,
        StartRoundUseCase,
        GetActiveTournamentUseCase,
        LeaveTournamentUseCase,
        RabbitMqGameGateway,
        TimerAdapter,
        LiveScoreService,
    ]
})
export class TournamentModule { }