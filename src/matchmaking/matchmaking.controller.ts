import { Controller, Get, Inject } from 'my-fastify-decorators';
import { MatchmakingService } from './matchmaking.service.js';

@Controller('/matchmaking')
export class MatchmakingController {
	@Inject(MatchmakingService)
	private matchmakingService!: MatchmakingService;

	/**
	 * Endpoint de Liveness Probe (Sonde de vie).
	 * URL: GET /matchmaking/health
	 * Utilisé par l'orchestrateur ou le Load Balancer pour vérifier que le service répond.
	 */
	@Get('/health')
	public async getHealthHandler() {
		console.debug('[MatchmakingController] [getHealthHandler] Health check requested.');

		const status = {
			status: 'ok',
			timestamp: new Date().toISOString(),
		};

		console.debug(`[MatchmakingController] [getHealthHandler] Responding with status: ${status.status}`);
		return status;
	}

	/**
	 * Endpoint de Debug / Monitoring.
	 * URL: GET /matchmaking/queue
	 * Retourne l'état actuel de la file d'attente (taille et temps d'attente).
	 * Utile pour valider visuellement que les sockets ajoutent bien les joueurs en mémoire.
	 */
	@Get('/queue')
	public async getQueueStatsHandler() {
		console.debug('[MatchmakingController] [getQueueStatsHandler] Queue stats requested.');

		const stats = this.matchmakingService.getQueueStats();

		console.debug(
      `[MatchmakingController] [getQueueStatsHandler] Returning stats | Size: ${stats.size} | MaxWait: ${stats.oldestRequestWaitTimeMs}ms`
    );

		return stats;
	}
}