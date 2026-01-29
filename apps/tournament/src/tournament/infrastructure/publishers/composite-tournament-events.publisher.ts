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
        this.publishers = [socketPublisher, rabbitMQPublisher].filter(p => {
            if (!p) {
                return false;
            }
            return true;
        });

        container.register(TournamentEventsPublisher, this);
    }

    public async publish(event: RecordedEvent): Promise<void> {
        await Promise.all(this.publishers.map(p => p.publish(event)));
    }

    public async publishAll(events: ReadonlyArray<RecordedEvent>): Promise<void> {
        await Promise.all(this.publishers.map(p => p.publishAll(events)));
    }
}
