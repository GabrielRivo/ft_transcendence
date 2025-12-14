import { Module } from 'my-fastify-decorators';
import { GameModule } from './game/game.module.js';
import { GestionModule } from './gestion/gestion.module.js';

@Module({
	imports: [
	GameModule,
	GestionModule
],
})
export class AppModule {}
