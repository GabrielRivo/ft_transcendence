import { Inject, Service, NotFoundException } from 'my-fastify-decorators';
import { type TournamentRepository } from '../../domain/ports/tournament-repository.js';
import { type TournamentEventsPublisher } from '../../domain/ports/tournament-events-publisher.js';
import { UpdateMatchScoreDto } from '../dtos/update-match-score.dto.js';

@Service()
export class ProcessMatchResultUseCase {
    @Inject('TournamentRepository')
    private repository!: TournamentRepository;

    @Inject('TournamentEventsPublisher')
    private publisher!: TournamentEventsPublisher;

    public async execute(tournamentId: string, matchId: string, command: UpdateMatchScoreDto): Promise<void> {
        const tournament = await this.repository.findById(tournamentId);
        if (!tournament) {
            throw new NotFoundException(`Tournament ${tournamentId} not found`);
        }

        tournament.updateMatchScore(matchId, command.scoreA, command.scoreB);

        await this.repository.save(tournament);
        await this.publisher.publishAll(tournament.getRecordedEvents());
        tournament.clearRecordedEvents();
    }
}