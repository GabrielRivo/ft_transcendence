import { Service, InjectPlugin } from 'my-fastify-decorators';
import { RabbitMQClient } from 'my-fastify-decorators-microservices';
import { GameFinishedEvent, GameScoreUpdatedEvent } from '../../game.events.js';

@Service()
export class GameEventsPublisher {
    @InjectPlugin('mq')
    private readonly client!: RabbitMQClient;

    public async publishGameFinished(event: GameFinishedEvent): Promise<void> {
        console.log(`[GameEventsPublisher] Publishing game.finished for game ${event.gameId}`);
        try {
            // Routing key 'game.finished' matches the pattern used in the exchange
            await this.client.publish('game.finished', event);
            console.log(`[GameEventsPublisher] Published successfully`);
        } catch (error) {
            console.error(`[GameEventsPublisher] Failed to publish:`, error);
        }
    }

    public async publishScoreUpdated(event: GameScoreUpdatedEvent): Promise<void> {
        // console.log(`[GameEventsPublisher] Publishing game.score_updated for game ${event.gameId}`);
        try {
            await this.client.publish('game.score_updated', event);
        } catch (error) {
            console.error(`[GameEventsPublisher] Failed to publish score update:`, error);
        }
    }
}
