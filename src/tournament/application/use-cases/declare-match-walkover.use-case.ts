import { Inject, Service, NotFoundException } from 'my-fastify-decorators';
import { DeclareMatchWalkoverDto } from '../dtos/declare-match-walkover.dto.js';
import { SqliteTournamentRepository } from '@/tournament/infrastructure/repositories/sqlite-tournament.repository.js';
import { SocketTournamentEventsPublisher } from '@/tournament/infrastructure/publishers/socket-tournament-events.publisher.js';

@Service()
export class DeclareMatchWalkoverUseCase {
    @Inject(SqliteTournamentRepository)
    private repository!: SqliteTournamentRepository;

    @Inject(SocketTournamentEventsPublisher)
    private publisher!: SocketTournamentEventsPublisher;

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