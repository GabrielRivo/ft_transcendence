import { TournamentRepository } from './tournament.repository';
import Database from 'better-sqlite3';
import { BracketData, TournamentStatus } from './types.js';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('TournamentRepository', () => {
  let repository: TournamentRepository;
  let db: Database.Database;

  const initSql = `
    CREATE TABLE IF NOT EXISTS tournaments (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'FINISHED', 'CANCELLED')),
        size INTEGER NOT NULL CHECK (size IN (4, 8, 16)),
        current_round INTEGER DEFAULT 1,
        start_mode TEXT NOT NULL CHECK (start_mode IN ('MANUAL', 'AUTO_FULL', 'AUTO_TIMER')),
        start_date TEXT, -- ISO8601 string
        bracket_data TEXT NOT NULL, -- JSON Payload
        created_by TEXT, -- UUID of the creator (User ID)
        admin_secret TEXT, -- Secret token for guest admin
        version INTEGER DEFAULT 0, -- Optimistic Lock
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );
  `;

  beforeEach(() => {
    // 1. Setup in-memory DB
    db = new Database(':memory:');
    db.exec(initSql);

    // 2. Initialize Repository
    repository = new TournamentRepository();
    // Manual injection of the private 'db' property
    Object.defineProperty(repository, 'db', { value: db });
    // Initialize prepared statements
    repository.onModuleInit();
  });

  afterEach(() => {
    db.close();
  });

  const mockBracketData: BracketData = {
    currentRound: 1,
    totalRounds: 2,
    matches: []
  };

  const mockTournament = {
    id: 'uuid-1',
    name: 'Test Tournament',
    status: 'PENDING' as TournamentStatus,
    size: 4,
    current_round: 1,
    start_mode: 'MANUAL',
    start_date: null,
    bracketData: mockBracketData,
    created_by: 'user-1',
    admin_secret: 'secret'
  };

  describe('createTournament', () => {
    it('should insert a new tournament correctly', () => {
      repository.createTournament(mockTournament);

      const row = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(mockTournament.id) as any;
      expect(row).toBeDefined();
      expect(row.name).toBe(mockTournament.name);
      expect(row.version).toBe(0);
      expect(JSON.parse(row.bracket_data)).toEqual(mockBracketData);
    });
  });

  describe('findTournamentById', () => {
    it('should return null if tournament does not exist', () => {
      const result = repository.findTournamentById('non-existent');
      expect(result).toBeNull();
    });

    it('should return the tournament with parsed bracket data', () => {
      repository.createTournament(mockTournament);
      
      const result = repository.findTournamentById(mockTournament.id);
      expect(result).toBeDefined();
      expect(result.id).toBe(mockTournament.id);
      expect(result.bracketData).toEqual(mockBracketData);
    });
  });

  describe('updateBracket (Optimistic Locking)', () => {
    beforeEach(() => {
      repository.createTournament(mockTournament);
    });

    it('should update bracket and increment version when versions match', () => {
      const newBracket = { ...mockBracketData, currentRound: 2 };
      const success = repository.updateBracket(mockTournament.id, newBracket, 2, 0); // version 0 expected

      expect(success).toBe(true);

      const updated = repository.findTournamentById(mockTournament.id);
      expect(updated.bracketData).toEqual(newBracket);
      expect(updated.current_round).toBe(2);
      expect(updated.version).toBe(1); // Incremented
    });

    it('should fail to update if version mismatch (race condition simulation)', () => {
      // Try to update with version 5 (current is 0)
      const success = repository.updateBracket(mockTournament.id, mockBracketData, 1, 5);

      expect(success).toBe(false);

      const notUpdated = repository.findTournamentById(mockTournament.id);
      expect(notUpdated.version).toBe(0); // Should remain unchanged
    });
  });

  describe('updateStatus (Optimistic Locking)', () => {
    beforeEach(() => {
      repository.createTournament(mockTournament);
    });

    it('should update status and increment version when versions match', () => {
      const success = repository.updateStatus(mockTournament.id, 'IN_PROGRESS', 0);

      expect(success).toBe(true);

      const updated = repository.findTournamentById(mockTournament.id);
      expect(updated.status).toBe('IN_PROGRESS');
      expect(updated.version).toBe(1);
    });

    it('should fail to update status if version mismatch', () => {
      const success = repository.updateStatus(mockTournament.id, 'IN_PROGRESS', 99);

      expect(success).toBe(false);

      const notUpdated = repository.findTournamentById(mockTournament.id);
      expect(notUpdated.status).toBe('PENDING');
      expect(notUpdated.version).toBe(0);
    });
  });

  describe('listByStatus', () => {
    it('should list tournaments by status', () => {
      repository.createTournament({ ...mockTournament, id: 't1', status: 'PENDING' });
      repository.createTournament({ ...mockTournament, id: 't2', status: 'IN_PROGRESS' });
      repository.createTournament({ ...mockTournament, id: 't3', status: 'PENDING' });

      const pendingList = repository.listByStatus('PENDING');
      expect(pendingList).toHaveLength(2);
      expect(pendingList.map(t => t.id)).toContain('t1');
      expect(pendingList.map(t => t.id)).toContain('t3');

      const progressList = repository.listByStatus('IN_PROGRESS');
      expect(progressList).toHaveLength(1);
      expect(progressList[0].id).toBe('t2');
    });
  });
});
