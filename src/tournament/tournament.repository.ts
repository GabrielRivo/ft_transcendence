import { InjectPlugin, Service } from 'my-fastify-decorators';
import { type Database, Statement } from 'better-sqlite3';
import { BracketData, TournamentStatus } from './types.js';

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

    createTournament(tournament: any): void {
        this.statements.create.run({
            ...tournament,
            bracket_data: JSON.stringify(tournament.bracketData),
            version: 0
        });
    }

    findTournamentById(id: string): any {
        const row = this.statements.findById.get(id) as any;
        if (!row) return null;
        return {
            ...row,
            bracketData: JSON.parse(row.bracket_data),
        };
    }

    updateBracket(id: string, bracket: BracketData, currentRound: number, version: number): boolean {
        const result = this.statements.updateBracket.run({
            id,
            bracket_data: JSON.stringify(bracket),
            current_round: currentRound,
            version
        });
        return result.changes > 0;
    }

    updateStatus(id: string, status: TournamentStatus, version: number): boolean {
        const result = this.statements.updateStatus.run({
            id,
            status,
            version
        });
        return result.changes > 0;
    }

    listByStatus(status: TournamentStatus): any[] {
        return this.statements.listByStatus.all(status).map((row: any) => ({
            ...row,
            bracketData: JSON.parse(row.bracket_data),
        }));
    }
}
