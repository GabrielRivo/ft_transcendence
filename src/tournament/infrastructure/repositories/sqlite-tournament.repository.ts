import { type Database, Transaction } from 'better-sqlite3';
import { InjectPlugin, Service } from 'my-fastify-decorators';
import { Match, MatchStatus, WinReason } from '../../domain/entities/match.js';
import { Tournament, TournamentSize, TournamentStatus, TournamentVisibility } from '../../domain/entities/tournament.js';
import { TournamentRepository } from '../../domain/ports/tournament.repository.js';
import { Participant } from '../../domain/value-objects/participant.js';
import { ConcurrencyException, PlayerAlreadyInActiveTournamentException } from '../../domain/exceptions.js';

@Service()
export class SqliteTournamentRepository implements TournamentRepository {
  @InjectPlugin('db')
  private db!: Database;

  public async save(tournament: Tournament): Promise<void> {
    const transaction: Transaction = this.db.transaction(() => {
      const checkExclusivity = this.db.prepare(`
        SELECT t.id as conflicting_tournament_id,
        p.id as participant_id
        FROM participants p
        JOIN tournaments t ON p.tournament_id = t.id
        WHERE p.id = ?
          AND t.status IN ('CREATED', 'STARTED')
          AND t.id != ?
        LIMIT 1  
      `);

      for (const p of tournament.participants) {
        const conflict = checkExclusivity.get(p.id, tournament.id) as any;
        if (conflict) {
          throw new PlayerAlreadyInActiveTournamentException(p.id, conflict.conflicting_tournament_id);
        }
      }
      
      let result;

      if (tournament.version === 0) {
        result = this.db.prepare(`
          INSERT INTO tournaments (id, name, size, owner_id, status, visibility, winner_id, version)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `).run(
          tournament.id,
          tournament.name,
          tournament.size,
          tournament.ownerId,
          tournament.status,
          tournament.visibility,
          tournament.winner ? tournament.winner.id : null,
        );

        (tournament as any)._version = 1;
      } else {
        result = this.db.prepare(`
          UPDATE tournaments
          SET    name = ?, size = ?, owner_id = ?, status = ?, visibility = ?, winner_id = ?, version = version + 1
          WHERE id = ? AND version = ?
        `).run(
          tournament.name,
          tournament.size,
          tournament.ownerId,
          tournament.status,
          tournament.visibility,
          tournament.winner ? tournament.winner.id : null,
          tournament.id,
          tournament.version
        );

        if (result.changes === 0) {
          throw new ConcurrencyException(tournament.id, tournament.version);
        }

        (tournament as any)._version++;
      }

      const upsertParticipant = this.db.prepare(`
        INSERT INTO participants (tournament_id, id, display_name, type)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (tournament_id, id) DO UPDATE SET
          display_name = excluded.display_name,
          type = excluded.type
      `);

      for (const p of tournament.participants) {
        upsertParticipant.run(tournament.id, p.id, p.displayName, p.type);
      }

      const upsertMatch = this.db.prepare(`
        INSERT INTO matches (
          id, tournament_id, round, position,
          player_a_id, player_b_id,
          score_a, score_b, winner_id, status, win_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
          player_a_id = excluded.player_a_id,
          player_b_id = excluded.player_b_id,
          score_a = excluded.score_a,
          score_b = excluded.score_b,
          winner_id = excluded.winner_id,
          status = excluded.status,
          win_reason = excluded.win_reason
      `);

      for (const m of tournament.matches) {
        upsertMatch.run(
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

    const visibility = (row.visibility ?? 'PUBLIC') as TournamentVisibility;

    return Tournament.reconstitute({
      id: row.id,
      name: row.name,
      size: row.size as TournamentSize,
      ownerId: row.owner_id,
      visibility,
      status: row.status as TournamentStatus,
      participants,
      matches,
      winner,
      version: row.version
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
    const tournamentRows = this.db.prepare(`SELECT * FROM tournaments`).all() as any[];
    if (tournamentRows.length === 0) return [];

    const tournamentsIds = tournamentRows.map(t => t.id);
    const placeholders = tournamentsIds.map(() => '?').join(',');

    const allParticipants = this.db.prepare(`SELECT * FROM participants WHERE tournament_id IN (${placeholders})`)
      .all([...tournamentsIds]) as any[];
    
    const allMatches = this.db.prepare(`SELECT * FROM matches WHERE tournament_id IN (${placeholders})`)
      .all([...tournamentsIds]) as any[];

    const participantsByTournamentId = new Map<string, Participant[]>();
    const globalParticipantsMap = new Map<string, Participant>();

    for (const p of allParticipants) {
      const participant = p.type === 'GUEST'
        ? Participant.createGuest(p.id, p.display_name)
        : Participant.createUser(p.id, p.display_name);
        
        if (!participantsByTournamentId.has(p.tournament_id)) {
          participantsByTournamentId.set(p.tournament_id, []);
        }
        participantsByTournamentId.get(p.tournament_id)!.push(participant);
        globalParticipantsMap.set(p.id, participant);
    }

    const matchesByTournamentId = new Map<string, Match[]>();
    for (const m of allMatches) {
      const playerA = m.player_a_id ? globalParticipantsMap.get(m.player_a_id) || null : null;
      const playerB = m.player_b_id ? globalParticipantsMap.get(m.player_b_id) || null : null;
      const winner = m.winner_id ? globalParticipantsMap.get(m.winner_id) || null : null;

      const match = Match.reconstitute({
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

      if (!matchesByTournamentId.has(m.tournament_id)) {
        matchesByTournamentId.set(m.tournament_id, []);
      }
      matchesByTournamentId.get(m.tournament_id)!.push(match);
    }

    return tournamentRows.map(t => {
      const winner = t.winner_id ? globalParticipantsMap.get(t.winner_id) || null : null;
      const visibility = (t.visibility ?? 'PUBLIC') as TournamentVisibility;
      return Tournament.reconstitute({
        id: t.id,
        name: t.name,
        size: t.size as TournamentSize,
        ownerId: t.owner_id,
        visibility,
        status: t.status as TournamentStatus,
        participants: participantsByTournamentId.get(t.id) || [],
        matches: matchesByTournamentId.get(t.id) || [],
        winner,
        version: t.version
      });
    });
  }
}
