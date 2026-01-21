import { type Database, Transaction } from 'better-sqlite3';
import { InjectPlugin, Service } from 'my-fastify-decorators';
import { Match, MatchStatus, WinReason } from '../../domain/entities/match.js';
import { Tournament, TournamentSize, TournamentStatus } from '../../domain/entities/tournament.js';
import { TournamentRepository } from '../../domain/ports/tournament.repository.js';
import { Participant } from '../../domain/value-objects/participant.js';

@Service()
export class SqliteTournamentRepository implements TournamentRepository {
  @InjectPlugin('db')
  private db!: Database;

  public async save(tournament: Tournament): Promise<void> {
    const transaction: Transaction = this.db.transaction(() => {
      this.db.prepare(`
        INSERT OR REPLACE INTO tournaments (id, name, size, owner_id, status, winner_id)
        VALUES (?, ?, ?, ?, ?, ?)  
      `).run(
        tournament.id,
        tournament.name,
        tournament.size,
        tournament.ownerId,
        tournament.status,
        tournament.winner ? tournament.winner.id : null
      );

      this.db.prepare('DELETE FROM participants WHERE tournament_id = ?').run(tournament.id);

      const insertParticipant = this.db.prepare(`
        INSERT INTO participants (tournament_id, id, display_name, type)
        VALUES (?, ?, ?, ?)
      `);

      for (const p of tournament.participants) {
        insertParticipant.run(tournament.id, p.id, p.displayName, p.type);
      }

      this.db.prepare('DELETE FROM matches WHERE tournament_id = ?').run(tournament.id);

      const insertMatch = this.db.prepare(`
        INSERT INTO matches (
          id, tournament_id, round, position,
          player_a_id, player_b_id,
          score_a, score_b, winner_id, status, win_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const m of tournament.matches) {
        insertMatch.run(
          m.id,
          tournament.id,
          m.round,
          m.position,
          m.playerA ? m.playerA.id : null,
          m.playerB ? m.playerB.id : null,
          m.scoreA,
          m.scoreB,
          m.winner ? m.winner.id : null,
          m.status,
          m.winReason
        );
      }
    });

    transaction();
  }

  public async findById(id: string): Promise<Tournament | null> {
    const row = this.db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id) as any;
    if (!row) return null;

    const participantRows = this.db.prepare('SELECT * FROM participants WHERE tournament_id = ?').all(id) as any[];
    const participantsMap = new Map<string, Participant>();

    const participants = participantRows.map(p => {
      const participant = p.type === 'GUEST'
        ? Participant.createGuest(p.id, p.display_name)
        : Participant.createUser(p.id, p.display_name);
      participantsMap.set(p.id, participant);
      return participant;
    });

    const matchRows = this.db.prepare('SELECT * FROM matches WHERE tournament_id = ?').all(id) as any[];
    const matches = matchRows.map(m => {
      const playerA = m.player_a_id ? participantsMap.get(m.player_a_id) || null : null;
      const playerB = m.player_b_id ? participantsMap.get(m.player_b_id) || null : null;
      const winner = m.winner_id ? participantsMap.get(m.winner_id) || null : null;
      
      return Match.reconstitute({
        id: m.id,
        round: m.round,
        position: m.position,
        playerA,
        playerB,
        scoreA: m.score_a,
        scoreB: m.score_b,
        winner,
        status: m.status as MatchStatus,
        winReason: m.win_reason as WinReason
      });
    });

    const winner = row.winner_id ? participantsMap.get(row.winner_id) || null : null;

    return Tournament.reconstitute({
      id: row.id,
      name: row.name,
      size: row.size as TournamentSize,
      ownerId: row.owner_id,
      status: row.status as TournamentStatus,
      participants,
      matches,
      winner
    });
  }

  public async findActiveByParticipantId(participantId: string): Promise<Tournament | null> {
    const row = this.db.prepare(`
      SELECT t.id
      FROM tournaments t
      JOIN participants p ON t.id = p.tournament_id
      WHERE p.id = ?
      AND t.status IN ('CREATED', 'STARTED')
      LIMIT 1  
    `).get(participantId) as any;

    if (!row) return null;
    return (await this.findById(row.id)) || null;
  }

  public async findAll(): Promise<Tournament[]> {
    const rows = this.db.prepare('SELECT id FROM tournaments').all() as any[];
    const tournaments: Tournament[] = [];
    for (const row of rows) {
      const t = await this.findById(row.id);
      if (t) tournaments.push(t);
    }
    return tournaments;
  }
}