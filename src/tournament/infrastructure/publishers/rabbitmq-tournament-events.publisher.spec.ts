import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { RabbitMQTournamentEventsPublisher } from './rabbitmq-tournament-events.publisher.js';
import { RabbitMQClient } from 'rabbitmq-client';
import { TournamentEventType } from '../../domain/events/tournament-events.js';
import { RecordedEvent } from '../../domain/events/base-event.js';

// Mock the external package
jest.mock('rabbitmq-client');

describe('RabbitMQTournamentEventsPublisher', () => {
    let publisher: RabbitMQTournamentEventsPublisher;
    let mockClient: jest.Mocked<RabbitMQClient>;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // create a mock instance
        mockClient = new RabbitMQClient({ url: 'mock' }) as jest.Mocked<RabbitMQClient>;
        mockClient.publish = jest.fn<any>();

        publisher = new RabbitMQTournamentEventsPublisher();
        (publisher as any).client = mockClient;
    });

    it('should publish CREATED event with correctly mapped routing key', async () => {
        const event = {
            eventName: TournamentEventType.CREATED,
            aggregateId: 'tournament-123',
            occurredAt: new Date(),
        } as RecordedEvent;

        await publisher.publish(event);

        expect(mockClient.publish).toHaveBeenCalledWith('tournament.created', event);
    });

    it('should publish PLAYER_JOINED event with correctly mapped routing key', async () => {
        const event = {
            eventName: TournamentEventType.PLAYER_JOINED,
            aggregateId: 'tournament-123',
            occurredAt: new Date(),
        } as RecordedEvent;

        await publisher.publish(event);

        expect(mockClient.publish).toHaveBeenCalledWith('tournament.player_joined', event);
    });

    it('should publish STARTED event with correctly mapped routing key', async () => {
        const event = {
            eventName: TournamentEventType.STARTED,
            aggregateId: 'tournament-123',
            occurredAt: new Date(),
        } as RecordedEvent;

        await publisher.publish(event);

        expect(mockClient.publish).toHaveBeenCalledWith('tournament.started', event);
    });

    it('should publish multiple events using publishAll', async () => {
        const events = [
            { eventName: TournamentEventType.CREATED } as RecordedEvent,
            { eventName: TournamentEventType.STARTED } as RecordedEvent
        ];

        await publisher.publishAll(events);

        expect(mockClient.publish).toHaveBeenCalledTimes(2);
        expect(mockClient.publish).toHaveBeenNthCalledWith(1, 'tournament.created', events[0]);
        expect(mockClient.publish).toHaveBeenNthCalledWith(2, 'tournament.started', events[1]);
    });
});
