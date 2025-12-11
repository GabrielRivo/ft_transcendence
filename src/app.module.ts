import { Module } from 'my-fastify-decorators';
import { GameModule } from './game/game.module.js';

@Module({
	imports: [
	GameModule
],
})
export class AppModule {}
