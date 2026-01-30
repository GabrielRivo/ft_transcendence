// ============================================================================
// GameEventsController - RabbitMQ Event Handlers for Game Creation
// ============================================================================
// Handles game creation events from Matchmaking and Tournament services.
// These services publish 'game.create' events to the 'matchmaking.fanout' exchange.
// ============================================================================

import { EventPattern, Payload } from 'my-fastify-decorators-microservices';
import { Inject, Service } from 'my-fastify-decorators';
import { GameService } from './game.service.js';

interface CreateGameEvent {
    gameId: string;
    player1Id: string;
    player2Id: string;
    type: 'ranked' | 'tournament';
    tournamentId?: string;
    isFinal?: boolean;
}

@Service()
export class GameEventsController {
    @Inject(GameService)
    private gameService!: GameService;

    @EventPattern('game.create')
    async handleGameCreate(@Payload() data: CreateGameEvent) {
        const result = this.gameService.createGame(
            data.gameId,
            data.player1Id,
            data.player2Id,
            data.type,
            data.tournamentId,
            data.isFinal
        );

        if (!result.success) {
            console.error(`[GameEventsController] Failed to create game ${data.gameId}: ${result.error} - ${result.message}`);
        } else {
            console.log(`[GameEventsController] Game ${data.gameId} created successfully via RabbitMQ`);
        }
    }
}
