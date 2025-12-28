import { Module } from 'my-fastify-decorators';
import { MatchmakingController } from './matchmaking.controller.js';
import { MatchmakingService } from './matchmaking.service.js';
import { MatchmakingGateway } from './matchmaking.gateway.js';
import { UserService } from './user.service.js';

@Module({
  controllers: [MatchmakingController],
  gateways: [MatchmakingGateway],
  providers: [MatchmakingService, UserService],
})
export class MatchmakingModule {}