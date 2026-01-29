import { Service, InjectPlugin } from 'my-fastify-decorators';
import { RabbitMQClient } from 'my-fastify-decorators-microservices';
import { GameFinishedEvent, GameScoreUpdatedEvent } from '../../game.events.js';

@Service()
export class GameEventsPublisher {
    @InjectPlugin('mq')
    private readonly client!: RabbitMQClient;

    public async publishGameFinished(event: GameFinishedEvent): Promise<void> {
        try {
            await this.client.publish('game.finished', event);
        } catch (error) { }
    }

    public async publishScoreUpdated(event: GameScoreUpdatedEvent): Promise<void> {
        try {
            await this.client.publish('game.score_updated', event);
        } catch (error) { }
    }
}
