import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { CompositeTournamentEventsPublisher } from './composite-tournament-events.publisher.js';
import { SocketTournamentEventsPublisher } from './socket-tournament-events.publisher.js';
import { RabbitMQTournamentEventsPublisher } from './rabbitmq-tournament-events.publisher.js';
import { RecordedEvent } from '../../domain/events/base-event.js';

// Mock container
jest.mock('my-fastify-decorators', () => ({
    Service: () => (target: any) => target,
    container: { register: jest.fn() }
}));

jest.mock('./socket-tournament-events.publisher.js');
jest.mock('./rabbitmq-tournament-events.publisher.js');

describe('CompositeTournamentEventsPublisher', () => {
    let composite: CompositeTournamentEventsPublisher;
    let mockSocketPublisher: jest.Mocked<SocketTournamentEventsPublisher>;
    let mockRabbitPublisher: jest.Mocked<RabbitMQTournamentEventsPublisher>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSocketPublisher = new SocketTournamentEventsPublisher() as jest.Mocked<SocketTournamentEventsPublisher>;
        mockRabbitPublisher = new RabbitMQTournamentEventsPublisher() as jest.Mocked<RabbitMQTournamentEventsPublisher>;

        // Setup mock implementations
        mockSocketPublisher.publish = jest.fn().mockImplementation(() => Promise.resolve()) as any;
        mockSocketPublisher.publishAll = jest.fn().mockImplementation(() => Promise.resolve()) as any;
        mockRabbitPublisher.publish = jest.fn().mockImplementation(() => Promise.resolve()) as any;
        mockRabbitPublisher.publishAll = jest.fn().mockImplementation(() => Promise.resolve()) as any;

        composite = new CompositeTournamentEventsPublisher(mockSocketPublisher, mockRabbitPublisher);
    });

    it('should delegate publish to all publishers', async () => {
        const event = { eventName: 'TEST', aggregateId: '1' } as RecordedEvent;

        await composite.publish(event);

        expect(mockSocketPublisher.publish).toHaveBeenCalledWith(event);
        expect(mockRabbitPublisher.publish).toHaveBeenCalledWith(event);
    });

    it('should delegate publishAll to all publishers', async () => {
        const events = [{ eventName: 'TEST', aggregateId: '1' }] as RecordedEvent[];

        await composite.publishAll(events);

        expect(mockSocketPublisher.publishAll).toHaveBeenCalledWith(events);
        expect(mockRabbitPublisher.publishAll).toHaveBeenCalledWith(events);
    });

    it('should continue if one publisher fails during publish', async () => {
        const event = { eventName: 'TEST', aggregateId: '1' } as RecordedEvent;
        const error = new Error('Socket fail');

        mockSocketPublisher.publish.mockRejectedValue(error);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        await composite.publish(event);

        expect(mockRabbitPublisher.publish).toHaveBeenCalledWith(event);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('should continue if one publisher fails during publishAll', async () => {
        const events = [{ eventName: 'TEST', aggregateId: '1' }] as RecordedEvent[];
        const error = new Error('Socket fail');

        mockSocketPublisher.publishAll.mockRejectedValue(error);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        await composite.publishAll(events);

        expect(mockRabbitPublisher.publishAll).toHaveBeenCalledWith(events);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});
