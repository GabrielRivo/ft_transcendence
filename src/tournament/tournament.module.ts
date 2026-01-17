import { Module } from 'my-fastify-decorators';
import { TournamentRepository } from './tournament.repository.js';

@Module({
	providers: [TournamentRepository],
})
export class TournamentModule {}