import { Inject, Service, NotFoundException, ForbiddenException } from 'my-fastify-decorators';
import { type TournamentRepository } from '../../domain/ports/tournament-repository.js';
import { type TournamentEventsPublisher } from '../../domain/ports/tournament-events-publisher.js';

@Service()
export class CancelTournamentUseCase {
    @Inject('TournamentRepository')
    private repository!: TournamentRepository;

    @Inject('TournamentEventsPublisher')
    private publisher!: TournamentEventsPublisher;

    public async execute(tournamentId: string, userId: string): Promise<void> {
        const tournament = await this.repository.findById(tournamentId);
        if (!tournament) {
            throw new NotFoundException(`Tournament ${tournamentId} not found`);
        }

        if (tournament.ownerId !== userId) {
            throw new ForbiddenException('You are not the owner of this tournament');
        }

        tournament.cancel();
        await this.repository.save(tournament);
        await this.publisher.publishAll(tournament.getRecordedEvents());
        tournament.clearRecordedEvents();
    }
}