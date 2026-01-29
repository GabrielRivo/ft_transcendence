import { Service, container } from 'my-fastify-decorators';
import { GameGateway } from '../../domain/ports/game.gateway.js';

@Service()
export class HttpGameGateway implements GameGateway {
    private readonly gameServiceUrl = process.env.GAME_SERVICE_URL || 'http://game:3000';

    constructor() {
        container.register(GameGateway, this);
    }

    // @Resilient used via manual fetch implementation or wrapper if decorator unavailable directly
    // Assuming simple fetch for now as Resilient usage might require setup
    public async createGame(matchId: string, player1Id: string, player2Id: string, tournamentId?: string, isFinal?: boolean): Promise<string> {
        const url = `${this.gameServiceUrl}/games`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameId: matchId,
                    player1Id,
                    player2Id,
                    type: 'tournament',
                    tournamentId,
                    isFinal
                })
            });

            if (!response.ok && response.status !== 409) {
                throw new Error(`Failed to create game: ${response.statusText}`);
            }

            // 409 means game already exists, which is acceptable for idempotency
            const data = await response.json() as any;
            return data.gameId || matchId;
        } catch (error) {
            throw error;
        }
    }
}
