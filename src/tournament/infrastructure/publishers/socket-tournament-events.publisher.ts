import { InjectPlugin, Service } from 'my-fastify-decorators';
import { Server } from 'socket.io';
import { RecordedEvent } from '../../domain/events/base-event.js';
import { TournamentEventType } from '../../domain/events/tournament-events.js';
import { TournamentEventsPublisher } from '../../domain/ports/tournament-events-publisher.js';

@Service()
export class SocketTournamentEventsPublisher extends TournamentEventsPublisher {
  @InjectPlugin('io')
  private io!: Server;

  constructor() {
    super();
    // container.register(TournamentEventsPublisher, this); // Handled by Composite
    console.log('[SocketTournamentEventsPublisher] Initialized');
  }

  public async publish(event: RecordedEvent): Promise<void> {
    const roomId = `tournament:${event.aggregateId}`;
    console.log(`[SocketPublisher] Publishing event ${event.eventName} to room ${roomId}`, JSON.stringify(event));
    this.io.to(roomId).emit(event.eventName, event);

    // Also emit snake_case version for compatibility if needed, tracking both
    // this.io.to(roomId).emit(event.eventName.replace(/([A-Z])/g, "_$1").toLowerCase().substring(1), event);

    if (this.isLobbyEvent(event.eventName as TournamentEventType)) {
      console.log(`[SocketPublisher] Publishing event ${event.eventName} to 'lobby' room`);
      this.io.to('lobby').emit(event.eventName, event);
    }
  }

  public async publishAll(events: ReadonlyArray<RecordedEvent>): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  private isLobbyEvent(eventName: TournamentEventType): boolean {
    return [
      TournamentEventType.CREATED,
      TournamentEventType.STARTED,
      TournamentEventType.FINISHED,
      TournamentEventType.CANCELLED,
      TournamentEventType.PLAYER_JOINED
    ].includes(eventName);
  }
}