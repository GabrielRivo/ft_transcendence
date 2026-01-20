import { Inject, Service, NotFoundException } from 'my-fastify-decorators';
import { Tournament } from '../../domain/entities/tournament.js';
import { type TournamentRepository } from '../../domain/ports/tournament-repository.js';

@Service()
export class GetTournamentUseCase {
    @Inject('TournamentRepository')
    private repository!: TournamentRepository;

    public async execute(tournamentId: string): Promise<Tournament> {
        const tournament = await this.repository.findById(tournamentId);
        if (!tournament) {
            throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);
        }
        return tournament;
    }
}