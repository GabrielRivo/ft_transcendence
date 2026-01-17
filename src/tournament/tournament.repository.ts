import { InjectPlugin, Service } from 'my-fastify-decorators';
import { type Database, Statement } from 'better-sqlite3';
import {
    BracketData,
    TournamentStatus,
    TournamentRow,
    Tournament,
    TournamentInsertData,
    mapRowToTournament,
} from '../types.js';

const createTournamentStatement = `
INSERT INTO tournaments (id, name, status, size, current_round, start_mode, start_date, bracket_data, created_by, admin_secret, version)
VALUES (@id, @name, @status, @size, @current_round, @start_mode, @start_date, @bracket_data, @created_by, @admin_secret, @version)
`;

const findTournamentByIdStatement = `
SELECT * FROM tournaments WHERE id = ?
`;

const updateBracketStatement = `
UPDATE tournaments 
SET bracket_data = @bracket_data, 
    current_round = @current_round,
    version = version + 1,
    updated_at = datetime('now')
WHERE id = @id AND version = @version
`;

const updateStatusStatement = `
UPDATE tournaments
SET status = @status,
    version = version + 1,
    updated_at = datetime('now')
WHERE id = @id AND version = @version
`;

const listTournamentsByStatusStatement = `
SELECT * FROM tournaments WHERE status = ?
`;

@Service()
export class TournamentRepository {
    @InjectPlugin('db')
    private db!: Database;

    private statements!: {
        create: Statement;
        findById: Statement;
        updateBracket: Statement;
        updateStatus: Statement;
        listByStatus: Statement;
    };

    onModuleInit(): void {
        this.statements = {
            create: this.db.prepare(createTournamentStatement),
            findById: this.db.prepare(findTournamentByIdStatement),
            updateBracket: this.db.prepare(updateBracketStatement),
            updateStatus: this.db.prepare(updateStatusStatement),
            listByStatus: this.db.prepare(listTournamentsByStatusStatement),
        };
    }

    create(data: TournamentInsertData): void {
        this.statements.create.run(data);
    }

    findById(id: string): Tournament | null {
        const row = this.statements.findById.get(id) as TournamentRow | undefined;
        if (!row) return null;
        return mapRowToTournament(row);
    }

    updateBracket(
        id: string,
        bracket: BracketData,
        currentRound: number,
        version: number
    ): boolean {
        const result = this.statements.updateBracket.run({
            id,
            bracket_data: JSON.stringify(bracket),
            current_round: currentRound,
            version,
        });
        return result.changes > 0;
    }

    updateStatus(id: string, status: TournamentStatus, version: number): boolean {
        const result = this.statements.updateStatus.run({
            id,
            status,
            version,
        });
        return result.changes > 0;
    }

    listByStatus(status: TournamentStatus): Tournament[] {
        const rows = this.statements.listByStatus.all(status) as TournamentRow[];
        return rows.map(mapRowToTournament);
    }
}
