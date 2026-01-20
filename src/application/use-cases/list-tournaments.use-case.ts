import { Inject, Service } from 'my-fastify-decorators';
import { Tournament } from '../../domain/entities/tournament.js';
import { type TournamentRepository } from '../../domain/ports/tournament-repository.js';
import { ListTournamentQueryDto } from '../dtos/list-tournaments.dto.js';

@Service()
export class ListTournamentsUseCase {
    @Inject('TournamentRepository')
    private repository!: TournamentRepository;

    public async execute(query: ListTournamentQueryDto): Promise<Tournament[]> {
        const tournaments = await this.repository.findAll();
        if (query.status) {
            return tournaments.filter(t => t.status === query.status);
        }
        return tournaments;
    }
}