import { Inject, Service, NotFoundException } from 'my-fastify-decorators';
import { PlayerAlreadyInActiveTournamentException } from '../../domain/exceptions.js';
import { TournamentRepository } from '../../domain/ports/tournament.repository.js';
import { TournamentEventsPublisher } from '../../domain/ports/tournament-events-publisher.js';
import { Participant } from '../../domain/value-objects/participant.js';
import { JoinTournamentDto } from '../dtos/join-tournament.dto.js';
import { SqliteTournamentRepository } from '@/tournament/infrastructure/repositories/sqlite-tournament.repository.js';
import { SocketTournamentEventsPublisher } from '@/tournament/infrastructure/publishers/socket-tournament-events.publisher.js';

@Service()
export class JoinTournamentUseCase {
    @Inject(SqliteTournamentRepository)
    private repository!: SqliteTournamentRepository;

    @Inject(SocketTournamentEventsPublisher)
    private publisher!: SocketTournamentEventsPublisher;

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
        const participant = isGuest
            ? Participant.createGuest(userId, command.displayName)
            : Participant.createUser(userId, command.displayName);

        tournament.join(participant);

        await this.repository.save(tournament);

        await this.publisher.publishAll(tournament.getRecordedEvents());
        tournament.clearRecordedEvents();
    }
}