import { Controller, Inject } from 'my-fastify-decorators';
import { EventPattern, Payload } from 'my-fastify-decorators-microservices';
import { TournamentRepository } from '../../domain/ports/tournament.repository.js';
import { TimerAdapter } from '../adapters/timer.adapter.js';
import { type GameFinishedEvent } from '../../domain/events/shared/game-finished.event.js';
import { StartRoundUseCase } from '../../application/use-cases/start-round.use-case.js';

import { SocketTournamentEventsPublisher } from '../publishers/socket-tournament-events.publisher.js';
import { CompositeTournamentEventsPublisher } from '../publishers/composite-tournament-events.publisher.js';

const READY_TIME_SEC = 30;

@Controller()
export class TournamentEventsController {
    @Inject(TournamentRepository)
    private repository!: TournamentRepository;

    @Inject(TimerAdapter)
    private timer!: TimerAdapter;

    @Inject(StartRoundUseCase)
    private startRoundUseCase!: StartRoundUseCase;

    @Inject(SocketTournamentEventsPublisher)
    private socketPublisher!: SocketTournamentEventsPublisher;

    @Inject(CompositeTournamentEventsPublisher)
    private compositePublisher!: CompositeTournamentEventsPublisher;

    @EventPattern('game.finished')
    async handleGameFinished(@Payload() event: GameFinishedEvent) {
        console.log(`[TournamentEventsController] Received game.finished event: ${event.gameId}`);

        try {
            const tournament = await this.repository.findByMatchId(event.gameId);
            if (!tournament) {
                console.warn(`[TournamentEventsController] Tournament not found for match ${event.gameId}`);
                return;
            }

            console.log(`[TournamentEventsController] Updating match ${event.gameId} for tournament ${tournament.id}`);
            tournament.updateMatchScore(event.gameId, event.score1, event.score2, event.winnerId);
            // tournament.onMatchFinished(event.gameId); // REMOVE: updateMatchScore already handles this

            await this.repository.save(tournament);
            await this.compositePublisher.publishAll(tournament.getRecordedEvents());
            tournament.clearRecordedEvents();

            // Check if round finished
            // To do this, we need to know the round of the match.
            const match = tournament.matches.find(m => m.id === event.gameId);

            if (match && tournament.isRoundFinished(match.round)) {
                if (tournament.status === 'FINISHED') {
                    console.log(`[TournamentEventsController] Tournament ${tournament.id} finished!`);
                    return;
                }

                console.log(`[TournamentEventsController] Round ${match.round} finished. Starting timer for next round.`);
                this.socketPublisher.publishTimer(tournament.id, READY_TIME_SEC); // Notify frontend immediately
                this.timer.start(tournament.id, READY_TIME_SEC, async () => {
                    await this.startRoundUseCase.execute(tournament.id);
                });
            }
        } catch (error) {
            console.error(`[TournamentEventsController] Error handling game finished:`, error);
        }
    }

    @EventPattern('game.score_updated')
    async handleScoreUpdated(@Payload() event: any) { // using any to avoid importing from game app directly if not shared
        console.log(`[TournamentEventsController] Received score update for game ${event.gameId}`);
        try {
            // We can use a lightweight lookup or cache if possible, but for now repository is fine 
            // assuming we don't want to add a direct mapping just for this. 
            // Actually, for high frequency, repository lookup might be heavy if SQlite.
            // But let's stick to correctness first.
            const tournament = await this.repository.findByMatchId(event.gameId);
            if (tournament) {
                this.socketPublisher.publish({
                    eventName: 'match_score_updated' as any,
                    aggregateId: tournament.id,
                    occurredAt: new Date(event.timestamp),
                    payload: {
                        matchId: event.gameId,
                        scoreA: event.score1,
                        scoreB: event.score2
                    }
                } as any);
            }
        } catch (error) {
            console.error(`[TournamentEventsController] Error handling score update:`, error);
        }
    }
}
