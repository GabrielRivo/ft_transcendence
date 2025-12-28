import {
  Inject,
  WebSocketGateway,
  SubscribeConnection,
  SubscribeDisconnection,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  JWTBody,
} from 'my-fastify-decorators';
import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { MatchmakingService } from './matchmaking.service.js';
import { UserService } from './user.service.js';
import type { JwtPayload } from './types.js';

/**
 * Schéma de validation pour la demande de rejoindre la file.
 */
const JoinQueueSchema = z.object({
  elo: z.number().int().min(0).optional(),
});

/**
 * Schéma de validation pour la réponse à une proposition de match.
 * On attend simplement l'ID du match concerné.
 */
const MatchDecisionSchema = z.object({
  matchId: z.string().uuid(),
});

/**
 * Extension du type Socket pour inclure nos données de session.
 */
interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
    elo?: number;
  };
}

@WebSocketGateway()
export class MatchmakingGateway {
  @Inject(MatchmakingService)
  private matchmakingService!: MatchmakingService;

  @Inject(UserService)
  private userService!: UserService;

  /**
   * Hook de cycle de vie : Initialisation du Gateway.
   * Capture l'instance du serveur Socket.io et la transmet au service
   * pour permettre les notifications serveur -> client (Feedback Loop).
   * @param server - L'instance du serveur Socket.io
   */
  public afterInit(server: Server): void {
    console.info('[MatchmakingGateway] [afterInit] WebSocket Gateway initialized.');
    
    if (this.matchmakingService) {
      this.matchmakingService.setServer(server);
    } else {
      console.error('[MatchmakingGateway] [afterInit] CRITICAL: MatchmakingService is not available during init.');
    }
  }

  /**
   * Gestionnaire de connexion.
   * Authentifie le socket via le JWT et charge les données utilisateur (Elo) depuis le service externe.
   */
  @SubscribeConnection()
  public async handleConnection(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @JWTBody() user: JwtPayload
  ): Promise<void> {
    const socketId = socket.id;

    // 1. Guard Strict : Le token JWT doit être valide et contenir un 'sub' (UserId)
    if (!user || !user.sub) {
      console.warn(
        `[MatchmakingGateway] [Connection] Rejected: Missing or invalid JWT | SocketId: ${socketId}`
      );
      socket.disconnect(true);
      return;
    }

    try {
      // 2. Récupération stricte des données (pas de fallback silencieux)
      const elo = await this.userService.getUserElo(user.sub);

      // Si le service renvoie une donnée invalide, on refuse la connexion
      if (typeof elo !== 'number' || elo < 0) {
        throw new Error(`Invalid Elo received from UserService: ${elo}`);
      }

      // 3. Initialisation de la session socket
      socket.data.userId = user.sub;
      socket.data.elo = elo;

      console.info(
        `[MatchmakingGateway] [Connection] Client connected | UserId: ${user.sub} | Elo: ${elo} | SocketId: ${socketId}`
      );
    } catch (error) {
      console.error(
        `[MatchmakingGateway] [Connection] Critical error loading user data | UserId: ${user.sub}`,
        error
      );
      // Refus de connexion si les données critiques sont manquantes ou si le service User est down
      socket.disconnect(true);
    }
  }

  /**
   * Gestionnaire de déconnexion.
   * Nettoie proprement la file d'attente si nécessaire.
   */
  @SubscribeDisconnection()
  public handleDisconnect(@ConnectedSocket() socket: AuthenticatedSocket): void {
    const userId = socket.data.userId;

    if (userId) {
      // removePlayer est idempotente, on peut l'appeler sans risque
      this.matchmakingService.removePlayer(userId);
      console.debug(
        `[MatchmakingGateway] [Disconnection] Session closed & cleaned | UserId: ${userId}`
      );
    }
  }

  /**
   * Demande pour rejoindre la file de matchmaking.
   */
  @SubscribeMessage('join_queue')
  public async handleJoinQueue(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: unknown
  ): Promise<void> {
    const userId = socket.data.userId;
    const sessionElo = socket.data.elo;

    if (!userId || sessionElo === undefined) {
      console.error(`[MatchmakingGateway] [JoinQueue] Unauthenticated socket tried to join queue.`);
      socket.disconnect(true);
      return;
    }

    const validation = JoinQueueSchema.safeParse(payload || {});
    
    if (!validation.success) {
      console.warn(`[MatchmakingGateway] [JoinQueue] Invalid payload from User ${userId}`);
      socket.emit('error', {
        message: 'Invalid payload',
        details: validation.error.issues, 
      });
      return;
    }

    try {
      const effectiveElo = validation.data.elo ?? sessionElo;

      // Note: Le paramètre priority est false par défaut lors d'un join manuel
      await this.matchmakingService.addPlayer(userId, socket.id, effectiveElo);

      socket.emit('queue_joined', {
        userId,
        elo: effectiveElo,
        timestamp: Date.now(),
      });
      
      console.info(
        `[MatchmakingGateway] [JoinQueue] Player joined | UserId: ${userId} | Elo: ${effectiveElo}`
      );
    } catch (error: any) {
      console.warn(
        `[MatchmakingGateway] [JoinQueue] Failed | UserId: ${userId} | Reason: ${error.message}`
      );
      socket.emit('error', { message: error.message });
    }
  }

  /**
   * Demande pour quitter volontairement la file.
   */
  @SubscribeMessage('leave_queue')
  public handleLeaveQueue(@ConnectedSocket() socket: AuthenticatedSocket): void {
    const userId = socket.data.userId;

    if (userId) {
      this.matchmakingService.removePlayer(userId);
      socket.emit('queue_left', { userId, timestamp: Date.now() });
      console.info(`[MatchmakingGateway] [LeaveQueue] Player left manually | UserId: ${userId}`);
    }
  }

  /**
   * Acceptation d'une proposition de match.
   */
  @SubscribeMessage('accept_match')
  public async handleAcceptMatch(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: unknown
  ): Promise<void> {
    const userId = socket.data.userId;
    if (!userId) return;

    const validation = MatchDecisionSchema.safeParse(payload || {});
    if (!validation.success) {
      socket.emit('error', { message: 'Invalid payload for accept_match' });
      return;
    }

    try {
      await this.matchmakingService.acceptMatch(userId, validation.data.matchId);
      // Feedback immédiat au client qui a accepté (optionnel, l'event global suivra)
      console.debug(`[MatchmakingGateway] [AcceptMatch] Ack | UserId: ${userId} | MatchId: ${validation.data.matchId}`);
    } catch (error: any) {
      console.warn(`[MatchmakingGateway] [AcceptMatch] Error | UserId: ${userId} | Reason: ${error.message}`);
      socket.emit('error', { message: error.message });
    }
  }

  /**
   * Refus d'une proposition de match.
   */
  @SubscribeMessage('decline_match')
  public async handleDeclineMatch(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() payload: unknown
  ): Promise<void> {
    const userId = socket.data.userId;
    if (!userId) return;

    const validation = MatchDecisionSchema.safeParse(payload || {});
    if (!validation.success) {
      socket.emit('error', { message: 'Invalid payload for decline_match' });
      return;
    }

    try {
      await this.matchmakingService.declineMatch(userId, validation.data.matchId);
      console.info(`[MatchmakingGateway] [DeclineMatch] Processed | UserId: ${userId} | MatchId: ${validation.data.matchId}`);
    } catch (error: any) {
      console.warn(`[MatchmakingGateway] [DeclineMatch] Error | UserId: ${userId} | Reason: ${error.message}`);
      socket.emit('error', { message: error.message });
    }
  }
}