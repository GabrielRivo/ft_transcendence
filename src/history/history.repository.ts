import { InjectPlugin, Service } from 'my-fastify-decorators';
import type { Database, Statement } from 'better-sqlite3';

export interface PlayerHistoryEntry {
	tournamentId: string;
	name: string;
	rank: number | null;
	date: string | null;
}

@Service()
export class HistoryRepository {
	@InjectPlugin('db')
	private db!: Database;

	private listByUserStmt!: Statement;

	onModuleInit(): void {
		this.listByUserStmt = this.db.prepare(`
			SELECT 
				p.tournament_id as tournamentId,
				t.name as name,
				p.rank as rank,
				t.updated_at as date
			FROM participants p
			JOIN tournaments t ON t.id = p.tournament_id
			WHERE p.user_id = @user_id
			ORDER BY t.updated_at DESC
			LIMIT 50
		`);
	}

	listByUser(userId: string): PlayerHistoryEntry[] {
		const rows = this.listByUserStmt.all({ user_id: userId }) as PlayerHistoryEntry[];
		return rows;
	}
}
