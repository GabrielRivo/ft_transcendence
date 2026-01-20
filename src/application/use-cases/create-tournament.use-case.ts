import { randomUUID } from "crypto";
import { Inject, Service } from 'my-fastify-decorators';
import { Tournament } from '../../domain/entities/tournament.js';
import { type TournamentRepository } from '../../domain/ports/tournament-repository.js';
import { type TournamentEventsPublisher } from '../../domain/ports/tournament-events-publisher.js';
import { CreateTournamentDto } from '../dtos/create-tournament.dto.js';

@Service()
export class CreateTournamentUseCase {
    @Inject('TournamentRepository')
    private repository!: TournamentRepository;

    @Inject('TournamentEventsPublisher')
    private publisher!: TournamentEventsPublisher;

    public async execute(command: CreateTournamentDto, ownerId: string): Promise<string> {
        const tournament = new Tournament(
            randomUUID(),
            command.name,
            command.size,
            ownerId,
        );
        await this.repository.save(tournament);
        await this.publisher.publishAll(tournament.getRecordedEvents());
        tournament.clearRecordedEvents();
        return tournament.id;
    }
}