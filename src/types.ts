// =============================================================================
// ENUMS & CONSTANTES (Alignés avec init.sql)
// =============================================================================

/** Statut du tournoi - CHECK (status IN ('PENDING', 'IN_PROGRESS', 'FINISHED', 'CANCELLED')) */
export const TOURNAMENT_STATUS = ['PENDING', 'IN_PROGRESS', 'FINISHED', 'CANCELLED'] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUS)[number];

/** Tailles autorisées - CHECK (size IN (4, 8, 16)) */
export const TOURNAMENT_SIZES = [4, 8, 16] as const;
export type TournamentSize = (typeof TOURNAMENT_SIZES)[number];

/** Statut d'un match dans le bracket */
export const MATCH_STATUS = ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] as const;
export type MatchStatus = (typeof MATCH_STATUS)[number];

/** Type de participant */
export const PARTICIPANT_TYPES = ['guest', 'user'] as const;
export type ParticipantType = (typeof PARTICIPANT_TYPES)[number];

// =============================================================================
// TYPES DB ROW (Correspondent exactement aux colonnes SQLite)
// =============================================================================

/**
 * Row SQLite de la table `tournaments`
 * Tous les champs sont snake_case comme dans init.sql
 */
export interface TournamentRow {
    id: string;
    name: string;
    status: TournamentStatus;
    size: TournamentSize;
    current_round: number;
    start_date: string | null;
    bracket_data: string; // JSON stringifié
    created_by: string | null;
    admin_secret: string | null;
    version: number;
    created_at: string;
    updated_at: string;
}

/**
 * Row SQLite de la table `participants`
 * Tous les champs sont snake_case comme dans init.sql
 */
export interface ParticipantRow {
    id: string;
    tournament_id: string;
    user_id: string | null;
    alias: string;
    avatar: string | null;
    rank: number | null;
    created_at: string;
}

// =============================================================================
// TYPES MÉTIER / DOMAIN (Utilisés dans les services)
// =============================================================================

/**
 * Participant dans un tournoi (version métier)
 * Utilisé dans les services et le bracket
 */
export interface Participant {
    id: string;
    alias: string;
    type: ParticipantType;
    userId: string | null;
    avatar?: string | null;
    rank?: number | null;
}

/**
 * Structure d'un match dans l'arbre du bracket
 */
export interface BracketMatch {
    id: number;
    round: number;
    status: MatchStatus;
    player1Id: string | null;
    player2Id: string | null;
    winnerId: string | null;
    score: [number, number] | null;
    nextMatchId: number | null;
    /** ID du game côté service matchmaking */
    gameId?: string;
    /** ISO8601 */
    startTime?: string;
    /** ISO8601 */
    endTime?: string;
}

/**
 * Structure complète du bracket (JSON stocké en DB)
 */
export interface BracketData {
    currentRound: number;
    totalRounds: number;
    matches: BracketMatch[];
}

/**
 * Tournoi complet (version métier avec bracket parsé)
 */
export interface Tournament {
    id: string;
    name: string;
    status: TournamentStatus;
    size: TournamentSize;
    currentRound: number;
    startDate: string | null;
    bracketData: BracketData;
    createdBy: string | null;
    adminSecret: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
}

// =============================================================================
// TYPES POUR CRÉATION / INSERTION
// =============================================================================

/**
 * Données pour insérer un nouveau tournoi (avant génération d'ID)
 */
export interface CreateTournamentData {
    name: string;
    size: TournamentSize;
    startDate?: string | null;
}

/**
 * Données complètes pour insertion en DB
 */
export interface TournamentInsertData {
    id: string;
    name: string;
    status: TournamentStatus;
    size: TournamentSize;
    current_round: number;
    start_date: string | null;
    bracket_data: string;
    created_by: string | null;
    admin_secret: string | null;
    version: number;
}

/**
 * Données pour insérer un participant en DB
 */
export interface ParticipantInsertData {
    id: string;
    tournament_id: string;
    user_id: string | null;
    alias: string;
    avatar: string | null;
    rank: number | null;
}

// =============================================================================
// FONCTIONS DE MAPPING DB <-> MÉTIER
// =============================================================================

/**
 * Convertit une row SQLite en objet Tournament métier
 */
export function mapRowToTournament(row: TournamentRow): Tournament {
    return {
        id: row.id,
        name: row.name,
        status: row.status,
        size: row.size,
        currentRound: row.current_round,
        startDate: row.start_date,
        bracketData: JSON.parse(row.bracket_data) as BracketData,
        createdBy: row.created_by,
        adminSecret: row.admin_secret,
        version: row.version,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/**
 * Convertit une row SQLite en objet Participant métier
 */
export function mapRowToParticipant(row: ParticipantRow): Participant {
    return {
        id: row.id,
        alias: row.alias,
        type: row.user_id ? 'user' : 'guest',
        userId: row.user_id,
        avatar: row.avatar,
        rank: row.rank,
    };
}

/**
 * Convertit un Participant métier en données d'insertion DB
 */
export function mapParticipantToInsertData(
    participant: Participant,
    tournamentId: string
): ParticipantInsertData {
    return {
        id: participant.id,
        tournament_id: tournamentId,
        user_id: participant.userId,
        alias: participant.alias,
        avatar: participant.avatar ?? null,
        rank: participant.rank ?? null,
    };
}

// =============================================================================
// TYPES DE RÉSULTATS DES OPÉRATIONS
// =============================================================================

/** Codes d'erreur pour les opérations sur les tournois */
export const TOURNAMENT_ERROR_CODES = [
	'TOURNAMENT_NOT_FOUND',
	'TOURNAMENT_CANCELLED',
	'TOURNAMENT_FULL',
	'TOURNAMENT_ALREADY_STARTED',
	'TOURNAMENT_NOT_PENDING',
	'TOURNAMENT_NOT_IN_PROGRESS',
	'PARTICIPANT_ALREADY_JOINED',
	'PARTICIPANT_NOT_FOUND',
	'ALIAS_REQUIRED_FOR_GUEST',
	'ALIAS_INVALID',
	'ALIAS_ALREADY_TAKEN',
	'NOT_ENOUGH_PARTICIPANTS',
	'MATCH_NOT_FOUND',
	'MATCH_NOT_READY',
	'MATCH_ALREADY_STARTED',
	'MATCH_ALREADY_COMPLETED',
	'INVALID_WINNER',
	'UNAUTHORIZED',
	'OPTIMISTIC_LOCK_ERROR',
	'GAME_SERVICE_UNAVAILABLE',
] as const;
export type TournamentErrorCode = (typeof TOURNAMENT_ERROR_CODES)[number];

/** Erreur typée pour les opérations de tournoi */
export interface TournamentError {
    code: TournamentErrorCode;
    message: string;
}

/** Résultat générique d'une opération (success ou error) */
export type OperationResult<T> =
    | { success: true; data: T }
    | { success: false; error: TournamentError };

/** Helper pour créer un résultat de succès */
export function success<T>(data: T): OperationResult<T> {
    return { success: true, data };
}

/** Helper pour créer un résultat d'erreur */
export function failure<T>(code: TournamentErrorCode, message: string): OperationResult<T> {
    return { success: false, error: { code, message } };
}

// =============================================================================
// TYPES SPÉCIFIQUES AUX OPÉRATIONS
// =============================================================================

/** Résultat de la création d'un tournoi */
export interface CreateTournamentResult {
    tournament: Tournament;
    adminSecret?: string | undefined;
}

/** Résultat de la jointure à un tournoi */
export interface JoinTournamentResult {
    tournament: Tournament;
    participant: Participant;
}

/** Résultat du démarrage d'un tournoi */
export interface StartTournamentResult {
    tournament: Tournament;
}

/** Résultat du lancement d'un match */
export interface LaunchMatchResult {
    match: BracketMatch;
    gameId: string;
}

/** Résultat du traitement d'un résultat de match */
export interface ProcessMatchResultData {
    tournament: Tournament;
    match: BracketMatch;
    isRoundComplete: boolean;
    isTournamentComplete: boolean;
    nextRound?: number | undefined;
    winner?: Participant | undefined;
}
