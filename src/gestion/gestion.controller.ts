import { Controller, Get, Inject } from 'my-fastify-decorators';
import { GestionService } from './gestion.service.js';

@Controller('/game/pong')
export class GestionController {
	@Inject(GestionService)
	private gestionService!: GestionService;


	@Get('/sessions')
	async getActiveSessions() {
		return this.gestionService.getActiveSessions();
	}
}
