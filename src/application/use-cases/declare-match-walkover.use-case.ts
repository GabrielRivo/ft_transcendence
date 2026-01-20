import { Inject, Service, NotFoundException } from 'my-fastify-decorators';
import { type TournamentRepository } from '../../domain/ports/tournament-repository.js';
import { type TournamentEventsPublisher } from '../../domain/ports/tournament-events-publisher.js';
import { DeclareMatchWalkoverDto } from '../dtos/declare-match-walkover.dto.js';

@Service()
export class DeclareMatchWalkoverUseCase {
    @Inject('TournamentRepository')
    private repository!: TournamentRepository;

    @Inject('TournamentEventsPublisher')
    private publisher!: TournamentEventsPublisher;

    public async execute(tournamentId: string, matchId: string, command: DeclareMatchWalkoverDto): Promise<void> {
        const tournament = await this.repository.findById(tournamentId);
        if (!tournament) {
            throw new NotFoundException(`Tournament ${tournamentId} not found`);
        }

        const match = tournament.matches.find(m => m.id === matchId);
        if (!match) throw new NotFoundException('Match not found');

        match.declareWalkover(command.winnerId);
        tournament.onMatchFinished(matchId);
        await this.repository.save(tournament);
        await this.publisher.publishAll(tournament.getRecordedEvents());
        tournament.clearRecordedEvents();
    }
}