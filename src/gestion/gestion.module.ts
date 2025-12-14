import { Module } from 'my-fastify-decorators';
import { GestionController } from './gestion.controller.js';
import { GestionService } from './gestion.service.js';

@Module({
	controllers: [GestionController],
	providers: [GestionService],
})
export class GestionModule {}
