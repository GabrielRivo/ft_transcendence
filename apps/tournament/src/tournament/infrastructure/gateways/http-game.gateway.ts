import { Service, container, InjectPlugin } from 'my-fastify-decorators';
import { RabbitMQClient } from 'my-fastify-decorators-microservices';
import { GameGateway } from '../../domain/ports/game.gateway.js';

@Service()
export class RabbitMqGameGateway implements GameGateway {
    @InjectPlugin('gameCreationMq')
    private gameCreationMq!: RabbitMQClient;

    constructor() {
        container.register(GameGateway, this);
    }

    public async createGame(matchId: string, player1Id: string, player2Id: string, tournamentId?: string, isFinal?: boolean): Promise<string> {
        await this.gameCreationMq.publish('game.create', {
            gameId: matchId,
            player1Id,
            player2Id,
            type: 'tournament',
            tournamentId,
            isFinal
        });

        return matchId;
    }
}
