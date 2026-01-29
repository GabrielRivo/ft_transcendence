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
    try {
      this.addPenaltyStmt = this.db.prepare(`
        INSERT INTO penalties (user_id, reason, expires_at)
        VALUES (@user_id, @reason, @expires_at)  
      `);

      this.getActivePenaltyStmt = this.db.prepare(`
        SELECT * FROM penalties
        WHERE user_id = @user_id AND expires_at > @now
        ORDER BY expires_at DESC
        LIMIT 1  
      `);
    } catch (error) {
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
    const expiresAtDate = new Date(Date.now() + durationSeconds * 1000);
    const expiresAtIso = expiresAtDate.toISOString();

    try {
      this.addPenaltyStmt.run({
        user_id: userId,
        reason: reason,
        expires_at: expiresAtIso,
      });
    } catch (error) {
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

    try {
      const penalty = this.getActivePenaltyStmt.get({
        user_id: userId,
        now: nowIso,
      }) as PenaltyEntry | undefined;

      if (penalty) {
        return penalty;
      }

      return null;
    } catch (error) {
      throw error;
    }
  }
}