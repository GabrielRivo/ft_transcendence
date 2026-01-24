import { randomUUID } from "crypto";
import { Inject, Service } from 'my-fastify-decorators';
import { Tournament } from '../../domain/entities/tournament.js';
import { Participant } from '../../domain/value-objects/participant.js';
import { TournamentRepository } from '../../domain/ports/tournament.repository.js';
import { TournamentEventsPublisher } from '../../domain/ports/tournament-events-publisher.js';
import { CreateTournamentDto } from '../dtos/create-tournament.dto.js';
import { SqliteTournamentRepository } from '@/tournament/infrastructure/repositories/sqlite-tournament.repository.js';
import { SocketTournamentEventsPublisher } from '@/tournament/infrastructure/publishers/socket-tournament-events.publisher.js';


@Service()
export class CreateTournamentUseCase {
    @Inject(SqliteTournamentRepository)
    private repository!: SqliteTournamentRepository;

    @Inject(SocketTournamentEventsPublisher)
    private publisher!: SocketTournamentEventsPublisher;

    public async execute(command: CreateTournamentDto, ownerId: string, ownerDisplayName: string): Promise<string> {
        console.log(`[CreateTournamentUseCase] Creating tournament '${command.name}' for owner '${ownerId}' (${ownerDisplayName})`);
        const tournament = new Tournament(
            randomUUID(),
            command.name,
            command.size,
            ownerId,
            command.visibility,
        );

        const owner = Participant.createUser(ownerId, ownerDisplayName);
        tournament.join(owner);

        await this.repository.save(tournament);

        await this.publisher.publishAll(tournament.getRecordedEvents());
        tournament.clearRecordedEvents();

        console.log(`[CreateTournamentUseCase] Tournament ${tournament.id} created and saved.`);
        return tournament.id;
    }
}
