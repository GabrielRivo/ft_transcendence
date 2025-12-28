import type { Database, Statement } from 'better-sqlite3';
import { InjectPlugin, Service, type OnModuleInit } from 'my-fastify-decorators';

/**
 * Interface représentant la structure d'une pénalité telle qu'elle est retournée par la base de données.
 * Les champs sont mappés depuis le snake_case SQL vers le camelCase TypeScript si nécessaire,
 * ou laissés tels quels selon la convention de l'ORM/Driver.
 * Ici, nous retournon l'objet brut pour éviter une surcharge de mapping inutile sur le chemin critique.
 */
export interface PenaltyEntry {
  id: number;
  user_id: string;
  reason: string;
  expires_at: string;
  created_at: string;
}

@Service()
export class PenaltyRepository implements OnModuleInit {
  @InjectPlugin('db')
  private db!: Database;

  /**
   * Requête préparée pour l'ajout d'une sanction.
   */
  private addPenaltyStmt!: Statement<{
    user_id: string;
    reason: string;
    expires_at: string;
  }>;

  /**
   * Requête préparée pour la vérification d'une sanction active.
   */
  private getActivePenaltyStmt!: Statement<{
    user_id: string;
    now: string;
  }>;

  /**
   * Cycle de vie : Initialisation du module.
   * Prépare les requêtes SQL pour garantir la performance et la sécurité (protection contre les injections SQL).
   */
  public onModuleInit(): void {
    console.debug('[PenaltyRepository] [Lifecycle] Initializing repository and preparing statements...');

    try {
      // Préparation de l'insertion
      // On laisse SQLite gérer le 'id' (AUTOINCREMENT) et le 'created_at' (DEFAULT CURRENT_TIMESTAMP)
      this.addPenaltyStmt = this.db.prepare(`
        INSERT INTO penalties (user_id, reason, expires_at)
        VALUES (@user_id, @reason, @expires_at)  
      `);

      // Préparation de la lecture
      // On injecte 'now' depuis JS pour garantir que le format de comparaison est strictement identique (ISO 8601)
      // LIMIT 1 est ajouté par précaution, bien qu'un joueur ne devrait idéalement avoir qu'une sanction active à la fois.
      // On trie par date d'expiration décroissante pour prendre la sanction la plus longue en cas de doublons.
      this.getActivePenaltyStmt = this.db.prepare(`
        SELECT * FROM penalties
        WHERE user_id = @user_id AND expires_at > @now
        ORDER BY expires_at DESC
        LIMIT 1  
      `);

      console.info('[PenaltyRepository] [Lifecycle] SQL Statements prepared successfully.');
    } catch (error) {
      console.error('[PenaltyRepository] [Lifecycle] Failed to prepare SQL statements.', error);
      throw error;
    }
  }

  /**
   * Ajoute une pénalité (banissement temporaire) à un utilisateur.
   * 
   * @param userId - L'identifiant unique de l'utilisateur
   * @param durationSeconds - La durée de la sanction en secondes.
   * @param reason - La raison du bannissement.
   */
  public addPenalty(userId: string, durationSeconds: number, reason: string): void {
    // Calcul de la date d'expiration
    // Note : On utilisate Date.now() + (secondes * 1000) pour obtenir des millisecondes
    const expiresAtDate = new Date(Date.now() + durationSeconds * 1000);
    const expiresAtIso = expiresAtDate.toISOString();

    console.debug(
      `[PenaltyRepository] [addPenalty] Applying penalty | UserId: ${userId} | Duration: ${durationSeconds}s | ExpiresAt: ${expiresAtIso} | Reason: ${reason}`
    );

    try {
      const result = this.addPenaltyStmt.run({
        user_id: userId,
        reason: reason,
        expires_at: expiresAtIso,
      });

      console.info(
        `[PenaltyRepository] [addPenalty] Penalty applied successfully | UserId: ${userId} | PenaltyId: ${result.lastInsertRowid}`
      );
    } catch (error) {
      console.error(
        `[PenaltyRepository] [addPenalty] Database Error: Failed to insert penalty | UserId: ${userId}`,
        error
      );
      throw error;
    }
  }

  /**
   * Vérifie si un utilisateur a une pénalité active.
   * Une pénalité est considérée active si sa date d'expiration est strictement supérerieure à l'instant présent.
   * 
   * @param userId - L'identifiant unique de l'utilisateur.
   * @returns L'entrée de la pénalité si trouvée, sinon null.
   */
  public getActivePenalty(userId: string): PenaltyEntry | null {
    const nowIso = new Date().toISOString();

    console.debug(
      `[PenaltyRepository] [getActivePenalty] Checking eligibility | UserId: ${userId} | ReferenceTime: ${nowIso}`
    );

    try {
      const penalty = this.getActivePenaltyStmt.get({
        user_id: userId,
        now: nowIso,
      }) as PenaltyEntry | undefined;

      if (penalty) {
        console.info(
          `[PenaltyRepository] [getActivePenalty] Active penalty found | UserId: ${userId} | ExpiresAt: ${penalty.expires_at} | Reason: ${penalty.reason}`
        );
        return penalty;
      }

      console.debug(`[PenaltyRepository] [getActivePenalty] No active penalty found | UserId: ${userId}`);
      return null;
    } catch (error) {
      console.error(
        `[PenaltyRepository] [getActivePenalty] Database Error: Failed to retrieve status | UserId: ${userId}`,
        error
      );
      throw error;
    }
  }
}