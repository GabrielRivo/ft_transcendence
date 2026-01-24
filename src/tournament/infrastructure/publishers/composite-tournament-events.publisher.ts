import { Service, container, Inject } from 'my-fastify-decorators';
import { RecordedEvent } from '../../domain/events/base-event.js';
import { TournamentEventsPublisher } from '../../domain/ports/tournament-events-publisher.js';
import { SocketTournamentEventsPublisher } from './socket-tournament-events.publisher.js';
import { RabbitMQTournamentEventsPublisher } from './rabbitmq-tournament-events.publisher.js';

@Service()
export class CompositeTournamentEventsPublisher extends TournamentEventsPublisher {
    private publishers: TournamentEventsPublisher[];

    constructor(
        @Inject(SocketTournamentEventsPublisher) socketPublisher: SocketTournamentEventsPublisher,
        @Inject(RabbitMQTournamentEventsPublisher) rabbitMQPublisher: RabbitMQTournamentEventsPublisher
    ) {
        super();
        console.log('[CompositeTournamentEventsPublisher] Constructor called');
        console.log(`[CompositeTournamentEventsPublisher] SocketPublisher: ${!!socketPublisher} `);
        console.log(`[CompositeTournamentEventsPublisher] RabbitMQPublisher: ${!!rabbitMQPublisher} `);

        this.publishers = [socketPublisher, rabbitMQPublisher].filter(p => {
            if (!p) {
                console.warn('[CompositeTournamentEventsPublisher] Warning: ONE OF THE PUBLISHERS IS UNDEFINED! Check DI configuration.');
                return false;
            }
            return true;
        });

        console.log(`[CompositeTournamentEventsPublisher] Initialized with ${this.publishers.length} publishers`);

        // Register this composite as the primary implementation
        container.register(TournamentEventsPublisher, this);
        console.log('[CompositeTournamentEventsPublisher] Registered as TournamentEventsPublisher');
    }

    public async publish(event: RecordedEvent): Promise<void> {
        await Promise.all(this.publishers.map(p => p.publish(event).catch(err => {
            console.error(`[CompositeTournamentEventsPublisher] Error publishing event to ${p.constructor.name}: `, err);
        })));
    }

    public async publishAll(events: ReadonlyArray<RecordedEvent>): Promise<void> {
        console.log(`[CompositeTournamentEventsPublisher] Publishing ${events.length} events...`);
        await Promise.all(this.publishers.map(p => p.publishAll(events).catch(err => {
            console.error(`[CompositeTournamentEventsPublisher] Error publishing events to ${p.constructor.name}: `, err);
        })));
    }
}
