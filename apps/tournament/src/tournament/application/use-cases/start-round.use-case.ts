import { Service, Inject } from 'my-fastify-decorators';
import { TournamentRepository } from '../../domain/ports/tournament.repository.js';
import { RabbitMqGameGateway } from '../../infrastructure/gateways/http-game.gateway.js';
import { SocketTournamentEventsPublisher } from '../../infrastructure/publishers/socket-tournament-events.publisher.js';

@Service()
export class StartRoundUseCase {
    @Inject(TournamentRepository)
    private repository!: TournamentRepository;

    @Inject(RabbitMqGameGateway)
    private gameGateway!: RabbitMqGameGateway;

    @Inject(SocketTournamentEventsPublisher)
    private socketPublisher!: SocketTournamentEventsPublisher;

    public async execute(tournamentId: string): Promise<void> {
        const tournament = await this.repository.findById(tournamentId);
        if (!tournament) {
            return;
        }

        const currentRound = tournament.getCurrentRound();
        if (!currentRound) {
            return;
        }

        const matches = tournament.matches.filter(m => m.round === currentRound);
        const playableMatches = matches.filter(m => m.isReady() && m.status !== 'FINISHED');

        for (const match of playableMatches) {
            try {
                const totalRounds = Math.log2(tournament.size);
                const isFinal = match.round === totalRounds;

                await this.gameGateway.createGame(match.id, match.playerA!.id, match.playerB!.id, tournamentId, isFinal);

                this.socketPublisher.publish({
                    eventName: 'match_started' as any,
                    aggregateId: tournamentId,
                    occurredAt: new Date(),
                    payload: {
                        matchId: match.id,
                        gameId: match.id,
                        player1Id: match.playerA!.id,
                        player2Id: match.playerB!.id
                    }
                } as any);
            } catch (error) {
                return;
            }
        }
    }
}
