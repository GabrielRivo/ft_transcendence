import { randomUUID } from "crypto";
import { Inject, Service } from 'my-fastify-decorators';
import { Tournament } from '../../domain/entities/tournament.js';
import { Participant } from '../../domain/value-objects/participant.js';
import { CreateTournamentDto } from '../dtos/create-tournament.dto.js';
import { SqliteTournamentRepository } from '../../infrastructure/repositories/sqlite-tournament.repository.js';
import { CompositeTournamentEventsPublisher } from '../../infrastructure/publishers/composite-tournament-events.publisher.js';


@Service()
export class CreateTournamentUseCase {
    @Inject(SqliteTournamentRepository)
    private repository!: SqliteTournamentRepository;

    @Inject(CompositeTournamentEventsPublisher)
    private publisher!: CompositeTournamentEventsPublisher;

    public async execute(command: CreateTournamentDto, ownerId: string, ownerDisplayName: string): Promise<string> {
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
        return tournament.id;
    }
}
