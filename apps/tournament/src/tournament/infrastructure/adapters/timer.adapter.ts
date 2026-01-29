import { Inject, Service, container } from 'my-fastify-decorators';
import { TimerPort } from '../../domain/ports/timer.port.js';
import { SocketTournamentEventsPublisher } from '../publishers/socket-tournament-events.publisher.js';

@Service()
export class TimerAdapter implements TimerPort {
    @Inject(SocketTournamentEventsPublisher)
    private socketPublisher!: SocketTournamentEventsPublisher;

    private timers: Map<string, NodeJS.Timeout> = new Map();

    constructor() {
        container.register(TimerPort, this);
    }

    public start(tournamentId: string, durationSeconds: number, onComplete: () => Promise<void>): void {
        this.stop(tournamentId); // Stop existing if any

        let remaining = durationSeconds;

        this.broadcastTick(tournamentId, remaining);

        const interval = setInterval(async () => {
            remaining--;
            this.broadcastTick(tournamentId, remaining);

            if (remaining <= 0) {
                this.stop(tournamentId);
                try {
                    await onComplete();
                } catch (error) { }
            }
        }, 1000);

        this.timers.set(tournamentId, interval);
    }

    public stop(tournamentId: string): void {
        const timer = this.timers.get(tournamentId);
        if (timer) {
            clearInterval(timer);
            this.timers.delete(tournamentId);
        }
    }

    private broadcastTick(tournamentId: string, remaining: number): void {
        this.socketPublisher.publishTimer(tournamentId, remaining);
    }
}
