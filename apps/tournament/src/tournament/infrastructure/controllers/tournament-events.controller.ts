import { Controller, Inject } from 'my-fastify-decorators';
import { EventPattern, Payload } from 'my-fastify-decorators-microservices';
import { TournamentRepository } from '../../domain/ports/tournament.repository.js';
import { TimerAdapter } from '../adapters/timer.adapter.js';
import { type GameFinishedEvent } from '../../domain/events/shared/game-finished.event.js';
import { StartRoundUseCase } from '../../application/use-cases/start-round.use-case.js';

import { SocketTournamentEventsPublisher } from '../publishers/socket-tournament-events.publisher.js';
import { CompositeTournamentEventsPublisher } from '../publishers/composite-tournament-events.publisher.js';
import { LiveScoreService } from '../services/live-score.service.js';

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

    @Inject(LiveScoreService)
    private liveScoreService!: LiveScoreService;

    @EventPattern('game.finished')
    async handleGameFinished(@Payload() event: GameFinishedEvent) {
        try {
            const tournament = await this.repository.findByMatchId(event.gameId);
            if (!tournament) {
                return;
            }

            tournament.updateMatchScore(event.gameId, event.score1, event.score2, event.winnerId);
            this.liveScoreService.removeMatch(tournament.id, event.gameId);

            await this.repository.save(tournament);
            await this.compositePublisher.publishAll(tournament.getRecordedEvents());
            tournament.clearRecordedEvents();

            const match = tournament.matches.find(m => m.id === event.gameId);

            if (match && tournament.isRoundFinished(match.round)) {
                if (tournament.status === 'FINISHED') {
                    return;
                }

                this.socketPublisher.publishTimer(tournament.id, READY_TIME_SEC); // Notify frontend immediately
                this.timer.start(tournament.id, READY_TIME_SEC, async () => {
                    await this.startRoundUseCase.execute(tournament.id);
                });
            }
        } catch (error) { }
    }

    @EventPattern('game.score_updated')
    async handleScoreUpdated(@Payload() event: any) { // using any to avoid importing from game app directly if not shared
        try {
            const tournament = await this.repository.findByMatchId(event.gameId);
            if (tournament) {
                this.liveScoreService.updateScore(tournament.id, event.gameId, event.score1, event.score2);
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
        } catch (error) { }
    }
}
