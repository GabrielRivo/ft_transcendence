import { InjectPlugin, Service } from 'my-fastify-decorators';
import { Server } from 'socket.io';
import { RecordedEvent } from '../../domain/events/base-event.js';
import { TournamentEventsPublisher } from '../../domain/ports/tournament-events-publisher.js';

@Service()
export class SocketTournamentEventsPublisher implements TournamentEventsPublisher {
  @InjectPlugin('io')
  private io!: Server;

  public async publish(event: RecordedEvent): Promise<void> {
    const roomId = `tournament_${event.aggregateId}`;
    this.io.to(roomId).emit(event.eventName, event);
    if (this.isLobbyEvent(event.eventName)) {
      this.io.to('lobby').emit(event.eventName, event);
    }
  }

  public async publishAll(events: ReadonlyArray<RecordedEvent>): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  private isLobbyEvent(eventName: string): boolean {
    return [
      'TournamentCreated',
      'TournamentStarted',
      'TournamentFinished',
      'TournamentCancelled',
      'PlayerJoined'
    ].includes(eventName);
  }
}