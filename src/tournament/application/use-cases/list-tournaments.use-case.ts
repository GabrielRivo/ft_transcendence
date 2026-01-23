import { Inject, Service } from 'my-fastify-decorators';
import { Tournament } from '../../domain/entities/tournament.js';
import { type TournamentRepository } from '../../domain/ports/tournament.repository.js';
import { ListTournamentsDto } from '../dtos/list-tournaments.dto.js';
import { SqliteTournamentRepository } from '@/tournament/infrastructure/repositories/sqlite-tournament.repository.js';

@Service()
export class ListTournamentsUseCase {
    @Inject(SqliteTournamentRepository)
    private repository!: SqliteTournamentRepository;

    public async execute(query: ListTournamentsDto): Promise<Tournament[]> {
        const tournaments = await this.repository.findAll();
        if (query.status) {
            return tournaments.filter(t => t.status === query.status);
        }
        return tournaments;
    }
}