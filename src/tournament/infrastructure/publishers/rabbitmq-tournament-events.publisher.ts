import { Service, InjectPlugin } from 'my-fastify-decorators';
import { RecordedEvent } from '../../domain/events/base-event.js';
import { TournamentEventType } from '../../domain/events/tournament-events.js';
import { TournamentEventsPublisher } from '../../domain/ports/tournament-events-publisher.js';
import { RabbitMQClient } from 'my-fastify-decorators-microservices';

@Service()
export class RabbitMQTournamentEventsPublisher extends TournamentEventsPublisher {
    @InjectPlugin('mq')
    private readonly client!: RabbitMQClient;

    public async publish(event: RecordedEvent): Promise<void> {
        console.log(`[RabbitMQTournamentEventsPublisher] Publishing event: ${event.eventName}`);
        const routingKey = this.getRoutingKey(event.eventName as TournamentEventType);
        console.log(`[RabbitMQTournamentEventsPublisher] Routing key: ${routingKey}`);
        try {
            await this.client.publish(routingKey, event);
            console.log(`[RabbitMQTournamentEventsPublisher] Published successfully`);
        } catch (error) {
            console.error(`[RabbitMQTournamentEventsPublisher] Failed to publish:`, error);
            throw error;
        }
    }

    public async publishAll(events: ReadonlyArray<RecordedEvent>): Promise<void> {
        for (const event of events) {
            await this.publish(event);
        }
    }

    private getRoutingKey(eventName: TournamentEventType): string {
        switch (eventName) {
            case TournamentEventType.CREATED:
                return 'tournament.created';
            case TournamentEventType.PLAYER_JOINED:
                return 'tournament.player_joined';
            case TournamentEventType.PLAYER_LEFT:
                return 'tournament.player_left';
            case TournamentEventType.STARTED:
                return 'tournament.started';
            case TournamentEventType.CANCELLED:
                return 'tournament.cancelled';
            case TournamentEventType.MATCH_FINISHED:
                return 'tournament.match_finished';
            case TournamentEventType.FINISHED:
                return 'tournament.finished';
            default:
                return `tournament.${(eventName as string).toLowerCase().replace(/tournament/g, '')}`;
        }
    }
}
