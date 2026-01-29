import type { Database, Statement } from 'better-sqlite3';
import { InjectPlugin, Service, type OnModuleInit } from 'my-fastify-decorators';

/**
 * Data Transfer Object représentant une session de jeu à archiver.
 * Cette interface découple la logique métier de la structure SQL sous-jacente.
 */
export interface SessionDto {
  id: string;
  player1Id: string;
  player2Id: string;
  // Ajout de 'STARTED' pour permettre le log à la création du match
  status: 'STARTED' | 'FINISHED' | 'CANCELLED' | 'ABORTED';
  startedAt: Date | number; // Supporte Date object ou Timestamp
  endedAt?: Date | number;
  metadata?: Record<string, unknown>; // Données libres (score, ...)
}

/**
 * Interface interne pour le typage strict des paramètres de la requête SQL.
 */
interface SqlSessionParams {
  id: string;
  player_1_id: string;
  player_2_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  metadata: string | null;
}

@Service()
export class MatchHistoryRepository implements OnModuleInit {
  @InjectPlugin('db')
  private db!: Database;

  /**
   * Statement pré-compilé pour l'insertion des sessions.
   * L'utilisation de `prepare` optimise les performances en parsant le SQL une seule fois
   * au démarrage de l'application.
   */
  private createSessionStmt!: Statement<SqlSessionParams>;

  /**
   * Cycle de vie : Initialisation du module.
   * Prépare les requêtes SQL pour garantir qu'elles sont prêtes avant le premier appel.
   */
  public onModuleInit(): void {
    try {
      this.createSessionStmt = this.db.prepare<SqlSessionParams>(`
        INSERT INTO matchmaking_sessions (
          id,
          player_1_id,
          player_2_id,
          status,
          started_at,
          ended_at,
          metadata
        ) VALUES (
          @id,
          @player_1_id,
          @player_2_id,
          @status,
          @started_at,
          @ended_at,
          @metadata 
        )
      `);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Persiste l'historique d'une session de jeu dans la base de données.
   * @param session - Les données de la session à enregistrer.
   * @throws Error si l'insertion échoue (ex: constrainte d'unicité violée).
   */
  public createSessionLog(session: SessionDto): void {
    const params: SqlSessionParams = {
      id: session.id,
      player_1_id: session.player1Id,
      player_2_id: session.player2Id,
      status: session.status,
      // Conversion standard ISO 8601 pour SQLite
      started_at: new Date(session.startedAt).toISOString(),
      ended_at: session.endedAt ? new Date(session.endedAt).toISOString() : null,
      // Sérialisation du JSON pour stockage TEXT
      metadata: session.metadata ? JSON.stringify(session.metadata) : null,
    };

    try {
      this.createSessionStmt.run(params);
    } catch (error) {
      throw error;
    }
  }
}