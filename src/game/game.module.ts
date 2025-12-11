import { Module } from 'my-fastify-decorators';
import { GameGateway } from './game.gateway.js';
import { GameService } from './game.service.js';

@Module({
	gateways: [GameGateway],
	providers: [GameService],
})
export class GameModule {}
