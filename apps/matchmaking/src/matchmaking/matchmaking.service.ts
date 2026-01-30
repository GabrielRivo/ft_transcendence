import { Server } from 'socket.io';
import { randomUUID } from 'crypto';
import { Service, Inject, InjectPlugin, type OnModuleInit, type OnModuleDestroy } from 'my-fastify-decorators';
import { RabbitMQClient } from 'my-fastify-decorators-microservices';
import { MatchHistoryRepository } from './repositories/match-history.repository.js';
import { PenaltyRepository } from './repositories/penalty.repository.js';
import { createQueuedPlayer, type QueuedPlayer, type PendingMatch } from './types.js';
import {
	BASE_TOLERANCE,
	EXPANSION_INTERVAL_MS,
	EXPANSION_STEP,
	TICK_RATE_MS,
} from './constants.js';

// Durée (en ms) laissée aux joueurs pour accepter le match
const MATCH_ACCEPT_TIMEOUT_MS = 15000;
// Durée (en secondes) de la pénalité pour un refus ou un timeout
const PENALTY_DURATION_SECONDS = 300;

@Service()
export class MatchmakingService implements OnModuleInit, OnModuleDestroy {
	private server: Server | undefined;

	/**
	 * Stockage principal des joueurs en recherche active.
	 */
	private activeQueue: Map<string, QueuedPlayer> = new Map();

	/**
	 * Index secondaire pour la vérification rapide des sockets.
	 */
	private activeSockets: Set<string> = new Set();

	/**
	 * Stockage des matchs en attente de confirmation (Ready Check).
	 * Key: matchId (UUID)
	 */
	private pendingMatches: Map<string, PendingMatch> = new Map();

	private matchmakingInterval: NodeJS.Timeout | undefined;

	@InjectPlugin('mq')
	private mq!: RabbitMQClient;

	constructor(
		@Inject(MatchHistoryRepository) private matchHistoryRepository: MatchHistoryRepository,
		@Inject(PenaltyRepository) private penaltyRepository: PenaltyRepository,
	) { }

	public onModuleInit(): void {
		this.matchmakingInterval = setInterval(() => this.matchmakingLoop(), TICK_RATE_MS);
	}

	public onModuleDestroy(): void {
		if (this.matchmakingInterval) {
			clearInterval(this.matchmakingInterval);
		}
		for (const match of this.pendingMatches.values()) {
			if (match.timeoutId) clearTimeout(match.timeoutId);
		}
	}

	public setServer(server: Server) {
		this.server = server;
	}

	/**
	 * Ajoute un joueur dans la file d'attente.
	 * Supporte maintenant le flag 'priority'.
	 */
	public async addPlayer(
		userId: string,
		socketId: string,
		elo: number,
		priority = false,
	): Promise<void> {
		const penalty = this.penaltyRepository.getActivePenalty(userId);
		if (penalty) throw new Error(`You are banned until ${penalty.expires_at}`);

		if (this.activeQueue.has(userId)) {
			throw new Error('User already in queue');
		}
		if (this.isUserInPendingMatch(userId)) {
			throw new Error('User already in a pending match');
		}
		if (this.activeSockets.has(socketId)) {
			throw new Error('Socket already active');
		}

		const player = createQueuedPlayer(userId, socketId, elo, priority);
		this.activeQueue.set(userId, player);
		this.activeSockets.add(socketId);
		this.emitQueueStats();
	}

	/**
	 * Retire un joueur de la file.
	 */
	public removePlayer(identifier: string): void {
		let targetId = identifier;

		// Tentative de résolution socketId -> userId
		if (!this.activeQueue.has(identifier)) {
			// Optimisation: on parcourt la map seulement si nécessaire
			for (const [uid, p] of this.activeQueue) {
				if (p.socketId === identifier) {
					targetId = uid;
					break;
				}
			}
		}

		const player = this.activeQueue.get(targetId);
		if (player) {
			this.activeSockets.delete(player.socketId);
			this.activeQueue.delete(targetId);
			this.emitQueueStats();
		}
	}

	public getQueueStats() {
		return {
			size: this.activeQueue.size,
			pending: this.pendingMatches.size,
		};
	}

	// ===========================================================================
	// WORKFLOW: READY CHECK (ACCEPT / DECLINE / TIMEOUT)
	// ===========================================================================

	/**
	 * Traite l'acceptation d'un match par un utilisateur.
	 */
	public async acceptMatch(userId: string, matchId: string): Promise<void> {
		const match = this.pendingMatches.get(matchId);
		if (!match) {
			throw new Error('Match not found or expired');
		}

		// Identification du joueur dans le match
		let playerRef;
		if (match.player1.userId === userId) playerRef = match.player1;
		else if (match.player2.userId === userId) playerRef = match.player2;
		else throw new Error('User is not a participant in this match');

		if (playerRef.status !== 'PENDING') {
			return;
		}

		playerRef.status = 'ACCEPTED';

		// If both players have accepted, finalize the match and create the game
		if (match.player1.status === 'ACCEPTED' && match.player2.status === 'ACCEPTED') {
			await this.finalizeMatch(match);
		}
	}

	/**
	 * Traite le refus explicite d'un match.
	 */
	public async declineMatch(userId: string, matchId: string): Promise<void> {
		const match = this.pendingMatches.get(matchId);
		if (!match) {
			throw new Error('Match not found or expired');
		}

		if (match.player1.userId !== userId && match.player2.userId !== userId) {
			throw new Error('User is not a participant in this match');
		}

		// Annulation du match avec UserId comme responsable
		this.cancelMatch(match, [userId], 'declined');
	}

	private async finalizeMatch(match: PendingMatch): Promise<void> {
		// Step 1: Clear the acceptance timeout to prevent race conditions
		if (match.timeoutId) clearTimeout(match.timeoutId);
		this.pendingMatches.delete(match.matchId);

		// Step 2: Archive the session start (non-blocking, failure is logged but not fatal)
		// This creates a record for analytics and debugging purposes
		try {
			this.matchHistoryRepository.createSessionLog({
				id: match.matchId,
				player1Id: match.player1.userId,
				player2Id: match.player2.userId,
				status: 'STARTED',
				startedAt: Date.now(),
			});
		} catch (e) {}

		// Step 3: Publish game.create event to RabbitMQ
		// The Game Service will receive this and create the game instance
		try {
			await this.mq.publish('game.create', {
				gameId: match.matchId,
				player1Id: match.player1.userId,
				player2Id: match.player2.userId,
				type: 'ranked',
			});

			// Success: Notify both players to connect to the Game Gateway
			this.handleGameCreationSuccess(match, match.matchId);
		} catch (e) {
			// Failure: Re-queue both players with priority
			this.handleGameCreationFailure(match, 'GAME_CREATION_FAILED', 'Failed to create game');
		}

		this.emitQueueStats();
	}

	/**
	 * Handles successful game creation by notifying both players.
	 *
	 * Players receive the 'match_confirmed' event with the gameId, which they
	 * use to establish a WebSocket connection to the Game Gateway.
	 *
	 * @param match - The pending match data
	 * @param gameId - The created game's ID (usually same as matchId)
	 */
	private handleGameCreationSuccess(match: PendingMatch, gameId: string): void {
		if (!this.server) return;

		// Construct the success payload with all information needed by the frontend
		const payload = {
			gameId,
			player1Id: match.player1.userId,
			player2Id: match.player2.userId,
		};

		// Notify both players that the match is confirmed and they should connect to the game
		this.server.to(match.player1.socketId).emit('match_confirmed', payload);
		this.server.to(match.player2.socketId).emit('match_confirmed', payload);
	}

	/**
	 * Handles game creation failure by re-queueing both players with priority.
	 *
	 * When the Game Service fails (network error, already exists, etc.), both players
	 * are put back in the queue with priority status to get matched again quickly.
	 * This provides a graceful degradation experience.
	 *
	 * @param match - The pending match data
	 * @param errorCode - Error code from GameService (e.g., 'GAME_ALREADY_EXISTS')
	 * @param errorMessage - Human-readable error message
	 *
	 * @remarks
	 * Error codes from GameService:
	 * - GAME_ALREADY_EXISTS: Rare race condition, retry with new UUID should work
	 * - PLAYER_ALREADY_IN_GAME: Player is already in another game (should not happen normally)
	 * - INVALID_PLAYERS: Invalid player IDs (configuration error)
	 * - Fallback message indicates network/service unavailability
	 */
	private handleGameCreationFailure(
		match: PendingMatch,
		errorCode: string,
		errorMessage: string,
	): void {
		// Notify both players of the failure
		const failurePayload = {
			matchId: match.matchId,
			reason: 'game_creation_failed',
			errorCode,
			message: errorMessage,
		};

		if (this.server) {
			this.server.to(match.player1.socketId).emit('match_failed', failurePayload);
			this.server.to(match.player2.socketId).emit('match_failed', failurePayload);
		}

		// Re-queue both players with priority status
		// They accepted the match, so they deserve priority for the next match attempt
		const players = [match.player1, match.player2];

		for (const player of players) {
			this.addPlayer(player.userId, player.socketId, player.elo, true);

			if (this.server) {
				this.server.to(player.socketId).emit('queue_joined', {
					userId: player.userId,
					elo: player.elo,
					timestamp: Date.now(),
					priority: true,
				});
			}
		}
	}

	/**
	 * Gère l'annulation d'un match (Timeout ou Refus).
	 * Applique les pénalités et remet les innocents en file prioritaire.
	 */
	private cancelMatch(match: PendingMatch, faultyUserIds: string[], reason: string): void {
		if (match.timeoutId) clearTimeout(match.timeoutId);
		this.pendingMatches.delete(match.matchId);

		const players = [match.player1, match.player2];
		const guiltySet = new Set(faultyUserIds);

		players.forEach((p) => {
			if (guiltySet.has(p.userId)) {
				try {
					this.penaltyRepository.addPenalty(
						p.userId,
						PENALTY_DURATION_SECONDS,
						`Matchmaking abuse: ${reason}`,
					);
				} catch (e) {}

				if (this.server) {
					this.server
						.to(p.socketId)
						.emit('match_cancelled', { reason: 'penalty_applied', matchId: match.matchId });
				}
			} else {
				this.addPlayer(p.userId, p.socketId, p.elo, true);

				if (this.server) {
					this.server
						.to(p.socketId)
						.emit('match_cancelled', { reason: 'opponent_declined', matchId: match.matchId });
					// Optionnel : Dire au front qu'il est de retour en file
					this.server.to(p.socketId).emit('queue_joined', {
						userId: p.userId,
						elo: p.elo,
						timestamp: Date.now(),
						priority: true,
					});
				}
			}
		});

		this.emitQueueStats();
	}

	/**
	 * Callback déclenché par le setTimeout si personne n'a validé à temps.
	 */
	private handleMatchTimeout(matchId: string): void {
		const match = this.pendingMatches.get(matchId);
		if (!match) return;

		const faultyUsers: string[] = [];
		if (match.player1.status === 'PENDING') faultyUsers.push(match.player1.userId);
		if (match.player2.status === 'PENDING') faultyUsers.push(match.player2.userId);

		this.cancelMatch(match, faultyUsers, 'timeout');
	}

	// ===========================================================================
	// CŒUR ALGORITHMIQUE (V2.1 - Ready Check Support - High Perf Mode)
	// ===========================================================================

	private matchmakingLoop(): void {
		if (this.activeQueue.size < 2) return;

		const candidates = Array.from(this.activeQueue.values());

		// Tri : Les joueurs prioritaires d'abord, puis par ELO croissant
		// Le tri est rapide (Timsort V8)
		candidates.sort((a, b) => {
			if (a.priority && !b.priority) return -1;
			if (!a.priority && b.priority) return 1;
			return a.elo - b.elo;
		});

		const now = Date.now();
		const matchedIds = new Set<string>();

		for (let i = 0; i < candidates.length; i++) {
			const playerA = candidates[i];
			// GUARD: Vérification contre undefined (nécessaire pour strict: true)
			if (!playerA) continue;

			if (matchedIds.has(playerA.userId)) continue;

			const waitTime = now - playerA.joinTime;
			if (waitTime > EXPANSION_INTERVAL_MS * playerA.rangeFactor) {
				playerA.rangeFactor += EXPANSION_STEP;
			}

			const priorityBonus = playerA.priority ? 2 : 1;
			const toleranceA = BASE_TOLERANCE * playerA.rangeFactor * priorityBonus;

			for (let j = i + 1; j < candidates.length; j++) {
				const playerB = candidates[j];
				// GUARD: Vérification contre undefined
				if (!playerB) continue;

				if (matchedIds.has(playerB.userId)) continue;

				const eloDiff = Math.abs(playerB.elo - playerA.elo);
				const toleranceB = BASE_TOLERANCE * playerB.rangeFactor;

				if (eloDiff <= toleranceA && eloDiff <= toleranceB) {
					matchedIds.add(playerA.userId);
					matchedIds.add(playerB.userId);
					this.handleMatchFound(playerA, playerB);
					break;
				}
			}
		}
	}

	private handleMatchFound(p1: QueuedPlayer, p2: QueuedPlayer): void {
		const matchId = randomUUID();
		const expiresAt = Date.now() + MATCH_ACCEPT_TIMEOUT_MS;

		// 1. Retrait de la file active
		this.activeQueue.delete(p1.userId);
		this.activeSockets.delete(p1.socketId);
		this.activeQueue.delete(p2.userId);
		this.activeSockets.delete(p2.socketId);

		// 2. Création de l'objet PendingMatch
		const pendingMatch: PendingMatch = {
			matchId,
			expiresAt,
			player1: {
				userId: p1.userId,
				socketId: p1.socketId,
				elo: p1.elo,
				status: 'PENDING',
			},
			player2: {
				userId: p2.userId,
				socketId: p2.socketId,
				elo: p2.elo,
				status: 'PENDING',
			},
		};

		// 3. Setup du Timeout
		// NOTE: Créer 2500 timeouts a un coût CPU léger mais inévitable pour cette feature.
		pendingMatch.timeoutId = setTimeout(() => {
			this.handleMatchTimeout(matchId);
		}, MATCH_ACCEPT_TIMEOUT_MS);

		this.pendingMatches.set(matchId, pendingMatch);

		// 4. Notification des clients (Sauté si pas de server, comme dans le benchmark)
		if (this.server) {
			const payload = { matchId, expiresAt };
			this.server.to(p1.socketId).emit('match_proposal', { ...payload, playerElo: p1.elo, opponentElo: p2.elo });
			this.server.to(p2.socketId).emit('match_proposal', { ...payload, playerElo: p2.elo, opponentElo: p1.elo });
		}

		this.emitQueueStats();
	}

	private isUserInPendingMatch(userId: string): boolean {
		for (const match of this.pendingMatches.values()) {
			if (match.player1.userId === userId || match.player2.userId === userId) {
				return true;
			}
		}
		return false;
	}

	private emitQueueStats(): void {
		const stats = this.getQueueStats();
		if (this.server) this.server.sockets.emit('queue_stats', stats);
	}
}
