import { Inject, Service, NotFoundException } from 'my-fastify-decorators';
import { SqliteTournamentRepository } from '@/tournament/infrastructure/repositories/sqlite-tournament.repository.js';
import { CompositeTournamentEventsPublisher } from '@/tournament/infrastructure/publishers/composite-tournament-events.publisher.js';

@Service()
export class LeaveTournamentUseCase {
    @Inject(SqliteTournamentRepository)
    private repository!: SqliteTournamentRepository;

    @Inject(CompositeTournamentEventsPublisher)
    private publisher!: CompositeTournamentEventsPublisher;

    public async execute(tournamentId: string, playerId: string): Promise<void> {
        const tournament = await this.repository.findById(tournamentId);

        if (!tournament) {
            throw new NotFoundException(`Tournament ${tournamentId} not found`);
        }

        tournament.leave(playerId);

        await this.repository.save(tournament);

        await this.publisher.publishAll(tournament.getRecordedEvents());
        tournament.clearRecordedEvents();
    }
}
