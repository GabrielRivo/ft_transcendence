/**
 * Configuration statique du module de Matchmaking.
 * Ce fichier centralise les constantes algorithmiques pour faciliter le réglage ed la "Matchmaking Loop".
 */

console.debug('[Matchmaking] [Constants] Loading algorithm configuration...');

/**
 * Fréquence d'exécution de la boucle principale (Matchmaking Loop) en millisecondes.
 * Définit la réactivité du système (Heartbeat).
 * Une valeur de 1000ms signifie que le serveur tente de former des paires chaque seconde.
 */
export const TICK_RATE_MS = 1000;

/**
 * Ecart de score ELO maximal accepté par défaut au moment précis de l'inscription (T=0).
 * Exemple : Un joueur à 1200 ELO cherchera initialement entre 1150 et 1250.
 */
export const BASE_TOLERANCE = 50;

/**
 * Nombre de points ELO ajoutés à la tolérance à chaque palier d'attente (Expansion Step).
 * Plus cette valeur est élevée, plus le système devient permissif rapidement.
 */
export const EXPANSION_STEP = 50;

/**
 * Durée en millisecondes nécessaires pour franchir un palier d'élargissement..
 * Exemple : 1000ms signifie que la tolérance s'élargit toutes les secondes.
 */
export const EXPANSION_INTERVAL_MS = 1000;

console.debug(
	`[Matchmaking] [Constants] Configuration loaded successfully | TickRate: ${TICK_RATE_MS}ms | BaseTolerance: ${BASE_TOLERANCE} | Step: ${EXPANSION_STEP} | Interval: ${EXPANSION_INTERVAL_MS}ms`,
);