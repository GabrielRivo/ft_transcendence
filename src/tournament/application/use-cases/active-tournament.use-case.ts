import { Inject, Service } from 'my-fastify-decorators';
import { TournamentRepository } from '../../domain/ports/tournament.repository.js';
import { Tournament } from '../../domain/entities/tournament.js';

@Service()
export class GetActiveTournamentUseCase {
    @Inject(TournamentRepository)
    private repository!: TournamentRepository;

    public async execute(userId: string): Promise<Tournament | null> {
        return this.repository.findActiveByParticipantId(userId);
    }
}
