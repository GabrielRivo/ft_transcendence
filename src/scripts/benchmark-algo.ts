import { performance } from 'perf_hooks';
import { MatchmakingService } from '../matchmaking/matchmaking.service.js';
import { MatchHistoryRepository } from '../matchmaking/repositories/match-history.repository.js';
import { PenaltyRepository, type PenaltyEntry } from '../matchmaking/repositories/penalty.repository.js';

// =============================================================================
// MOCKS (Isolation des dépendances)
// =============================================================================

/**
 * Mock du Repository d'historique.
 * Simule l'écriture en base de données sans rien faire (No-Op).
 * Doit être synchrone pour respecter la signature de la classe parente.
 */
class MockMatchHistoryRepository extends MatchHistoryRepository {
  override createSessionLog(_session: any): void {
    // No-Op : On ne fait rien pour ne pas impacter le benchmark CPU
  }
}

/**
 * Mock du Repository de pénalités.
 * Garantit qu'aucun joueur généré n'est considéré comme banni.
 * Doit être synchrone pour respecter la signature de la classe parente.
 */
class MockPenaltyRepository extends PenaltyRepository {
  override getActivePenalty(_userId: string): PenaltyEntry | null {
    // On retourne null directement (pas de Promise) car better-sqlite3 est synchrone
    return null;
  }
}

// =============================================================================
// UTILS
// =============================================================================

/**
 * Génère un nombre aléatoire suivant une distribution normale (Gaussienne).
 * Utilise la transformation de Box-Muller.
 * @param mean Moyenne (ex: 1200)
 * @param stdDev Écart-type (ex: 400)
 */
function randomGaussian(mean: number, stdDev: number): number {
  const u1 = 1 - Math.random(); // Conversion [0,1) -> (0,1]
  const u2 = 1 - Math.random();
  
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  
  // On arrondit pour avoir un ELO entier
  return Math.round(z * stdDev + mean);
}

// =============================================================================
// MAIN BENCHMARK
// =============================================================================

async function runBenchmark() {
  console.log('================================================================');
  console.log(' BENCHMARK ALGORITHME MATCHMAKING (Baseline)');
  console.log('================================================================');

  // 1. Instanciation du Service en isolation (Injection manuelle des Mocks)
  // -----------------------------------------------------------------------
  const mockHistoryRepo = new MockMatchHistoryRepository();
  const mockPenaltyRepo = new MockPenaltyRepository();
  // @ts-ignore - On ignore les erreurs de typage liées à l'injection de dépendances stricte
  const service = new MatchmakingService(mockHistoryRepo, mockPenaltyRepo);

  // Configuration de la simulation
  const PLAYER_COUNT = 200000;
  const MEAN_ELO = 1500;
  const STD_DEV_ELO = 1000; // Une distribution réaliste de joueurs

  console.log(`[Setup] Instantiation du service terminée.`);
  console.log(`[Setup] Génération de ${PLAYER_COUNT} joueurs (Distribution Gaussienne: Mean=${MEAN_ELO}, StdDev=${STD_DEV_ELO})...`);

  // 2. Injection massive de joueurs
  // -----------------------------------------------------------------------
  const startInjection = performance.now();
  
  for (let i = 0; i < PLAYER_COUNT; i++) {
    const userId = `user-${i}`;
    const socketId = `socket-${i}`;
    
    // On s'assure que l'ELO reste positif (min 0)
    const elo = Math.max(0, randomGaussian(MEAN_ELO, STD_DEV_ELO));

    try {
      await service.addPlayer(userId, socketId, elo);
    } catch (err) {
      console.error(`[Error] Failed to add player ${userId}:`, err);
    }
  }

  const endInjection = performance.now();
  console.log(`[Setup] Injection terminée en ${(endInjection - startInjection).toFixed(2)}ms`);

  // Force un certain "temps d'attente" simulé pour activer l'expansion de plage (optionnel pour baseline stricte)
  // Pour la baseline pure O(N^2), on peut supposer que tout le monde vient d'arriver (rangeFactor = 1).
  
  console.log(`[Benchmark] Lancement de la boucle de matchmaking (1 Tick)...`);

  // 3. Mesure de la boucle de matchmaking
  // -----------------------------------------------------------------------
  const startTick = performance.now();

  // Accès à la méthode privée via casting 'any' pour le benchmark
  (service as any).matchmakingLoop();

  const endTick = performance.now();
  const duration = endTick - startTick;

  // 4. Résultats
  // -----------------------------------------------------------------------
  const stats = service.getQueueStats();
  // On calcule approximativement le nombre de matchs trouvés : (Joueurs initiaux - Joueurs restants) / 2
  const matchesFound = (PLAYER_COUNT - stats.size) / 2;

  console.log('----------------------------------------------------------------');
  console.log(' RÉSULTATS DU BENCHMARK');
  console.log('----------------------------------------------------------------');
  console.log(` Joueurs initiaux      : ${PLAYER_COUNT}`);
  console.log(` Joueurs restants      : ${stats.size}`);
  console.log(` Matchs trouvés        : ${matchesFound}`);
  console.log(` Temps d'exécution     : ${duration.toFixed(4)} ms`);
  console.log('----------------------------------------------------------------');
  
  if (duration > 16) {
    console.warn(`[WARNING] Le temps d'exécution dépasse 16ms (1 frame à 60fps). Risque de blocage de l'Event Loop.`);
  } else {
    console.log(`[SUCCESS] Performance acceptable (< 16ms).`);
  }

  // FORCE L'ARRÊT IMMÉDIAT
  // On ne veut pas attendre les timeouts de 15s du Ready Check pour terminer le script
  process.exit(0);
}

// Exécution
runBenchmark().catch(console.error);