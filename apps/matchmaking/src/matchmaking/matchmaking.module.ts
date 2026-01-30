import { Module } from 'my-fastify-decorators';
import { MatchmakingService } from './matchmaking.service.js';
import { MatchmakingGateway } from './matchmaking.gateway.js';
import { UserService } from './user.service.js';

@Module({
	controllers: [],
	gateways: [MatchmakingGateway],
	providers: [MatchmakingService, UserService],
})
export class MatchmakingModule {}
