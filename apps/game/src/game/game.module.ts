import { Module } from 'my-fastify-decorators';
import { GameGateway } from './game.gateway.js';
import { GameService } from './game.service.js';
import { GameController } from './game.controller.js';
import { GameEventsController } from './game-events.controller.js';
import { GameEventsPublisher } from './infrastructure/publishers/game-events.publisher.js';

@Module({
	gateways: [GameGateway],
	providers: [GameService, GameEventsPublisher, GameEventsController],
	controllers: [GameController],
})
export class GameModule { }
