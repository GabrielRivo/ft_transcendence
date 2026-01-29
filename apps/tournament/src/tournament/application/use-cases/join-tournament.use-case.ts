import { Inject, Service, NotFoundException } from 'my-fastify-decorators';
import { PlayerAlreadyInActiveTournamentException } from '../../domain/exceptions.js';
import { Participant } from '../../domain/value-objects/participant.js';
import { JoinTournamentDto } from '../dtos/join-tournament.dto.js';
import { SqliteTournamentRepository } from '../../infrastructure/repositories/sqlite-tournament.repository.js';
import { CompositeTournamentEventsPublisher } from '../../infrastructure/publishers/composite-tournament-events.publisher.js';
import { TimerAdapter } from '../../infrastructure/adapters/timer.adapter.js';
import { StartRoundUseCase } from './start-round.use-case.js';

const READY_TIME_SEC = 30;

@Service()
export class JoinTournamentUseCase {
    @Inject(SqliteTournamentRepository)
    private repository!: SqliteTournamentRepository;

    @Inject(CompositeTournamentEventsPublisher)
    private publisher!: CompositeTournamentEventsPublisher;

    @Inject(TimerAdapter)
    private timer!: TimerAdapter;

    @Inject(StartRoundUseCase)
    private startRoundUseCase!: StartRoundUseCase;

    public async execute(
        tournamentId: string,
        command: JoinTournamentDto,
        userId: string,
        isGuest: boolean,
    ): Promise<void> {
        const activeTournament = await this.repository.findActiveByParticipantId(userId);
        if (activeTournament) {
            throw new PlayerAlreadyInActiveTournamentException(userId, activeTournament.id);
        }

        const tournament = await this.repository.findById(tournamentId);
        if (!tournament) {
            throw new NotFoundException(`Tournament ${tournamentId} not found`);
        }

        const participant = isGuest
            ? Participant.createGuest(userId, command.displayName)
            : Participant.createUser(userId, command.displayName);

        const wasStarted = tournament.status === 'STARTED';
        tournament.join(participant);
        const isStarted = tournament.status === 'STARTED';

        await this.repository.save(tournament);

        await this.publisher.publishAll(tournament.getRecordedEvents());
        tournament.clearRecordedEvents();

        // If tournament just started, triggers the timer
        if (!wasStarted && isStarted) {
            this.timer.start(tournament.id, READY_TIME_SEC, async () => {
                await this.startRoundUseCase.execute(tournament.id);
            });
        }
    }
}