/**
 * Interface représentant le payload JWT extrait du token.
 * Utilisé pour identifier l'utilisateur connecté via le décorateur @JWTBody.
 */
export interface JwtPayload {
  sub: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

/**
 * Représente un joueur actuellement en attente dans la file de matchmaking.
 * Cet objet agit comme un instantané (snapshot) des données nécessaires à l'algorithme.
 */
export interface QueuedPlayer {
  /** Identifiant unique du joueur (Clé primaire métier) */
  userId: string;

  /** Identifiant technique de la connexion WebSocket */
  socketId: string;

  /** Score ELO figé au moment de l'inscription */
  elo: number;

  /** Timestamp (ms) de l'entrée dans la file (référence pour l'attente) */
  joinTime: number;

  /** Multiplicateur dynamique de tolérance (défaut: 1) */
  rangeFactor: number;

  /**
   * Indique si le joueur est prioritaire.
   * True si le joueur revient dans la file après qu'un adversaire a refusé un match.
   */
  priority: boolean;
}

/**
 * États possibles de la réponse d'un joueur à une proposition de match.
 */
export type MatchResponseStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

/**
 * Représente un match proposé mais pas encore validé par les deux parties.
 */
export interface PendingMatch {
  matchId: string;
  player1: {
    userId: string;
    socketId: string;
    elo: number;
    status: MatchResponseStatus;
  };
  player2: {
    userId: string;
    socketId: string;
    elo: number;
    status: MatchResponseStatus;
  };
  /** Date d'expiration de la proposition (Timestamp ms) */
  expiresAt: number;
  /** Référence au timer Node.js pour pouvoir l'annuler si tout le monde répond avant */
  timeoutId?: NodeJS.Timeout;
}

/**
 * Factory function pour instancier un QueuedPlayer avec des valeurs par défaut sécurisées.
 * Inclut un log de debug verveux pour tracer la création de l'objet.
 *
 * @param userId - L'UUID de l'utilisateur
 * @param socketId - L'ID du socket client
 * @param elo - Le score ELO actuel
 * @param priority - (Optionnel) Si le joueur doit être traité en priorité
 */
export function createQueuedPlayer(
  userId: string,
  socketId: string,
  elo: number,
  priority: boolean = false,
): QueuedPlayer {
  const joinTime = Date.now();
  const rangeFactor = 1;

  const player: QueuedPlayer = {
    userId,
    socketId,
    elo,
    joinTime,
    rangeFactor,
    priority,
  };

  return player;
}