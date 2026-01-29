import Database, { Statement } from 'better-sqlite3';
import { InjectPlugin, Service } from 'my-fastify-decorators';

@Service()
export class GeneralChatService {
	@InjectPlugin('db')
	private db !: Database.Database;
	private statementSaveGeneral !: Statement<{ userId: number, username: string, msgContent: string }>;
	private statementGetGeneralHistory !: Statement<[]>;
	private statementGetAllGeneralHistory !: Statement<[]>;
	private statementDeleteMessagesByUser !: Statement<{ userId: number }>;

	onModuleInit() {
		this.statementSaveGeneral = this.db.prepare(
			`INSERT INTO generalChatHistory (userId, username, msgContent) VALUES (@userId, @username, @msgContent)`
		);
		this.statementGetGeneralHistory = this.db.prepare(
			`SELECT * FROM generalChatHistory ORDER BY created_at DESC LIMIT 50`
		);
		this.statementGetAllGeneralHistory = this.db.prepare(
			`SELECT * FROM generalChatHistory ORDER BY created_at DESC LIMIT 100`
		);
		this.statementDeleteTournamentMessage = this.db.prepare(
			`DELETE FROM generalChatHistory WHERE userId = -1 AND msgContent LIKE ?`
		);
		this.statementDeleteMessagesByUser = this.db.prepare(
			`DELETE FROM generalChatHistory WHERE userId = @userId`
		);
	}
	private statementDeleteTournamentMessage!: Statement<[string]>;
	async saveGeneralMessage(userId: number, username: string, content: string) {
		try {
			return this.statementSaveGeneral.run({ userId, username, msgContent: content });
		}
		catch (e) {
			return null;
		}
	}

	async deleteTournamentSystemMessage(tournamentId: string) {
		try {
			const pattern = `%[JOIN_TOURNAMENT:${tournamentId}]%`;
			const result = this.statementDeleteTournamentMessage.run(pattern);
			return result;
		} catch (e) {
			return null;
		}
	}

		async getGeneralHistory() {
		const rows = this.statementGetGeneralHistory.all() as any[];
		const tournamentMsgs = rows.filter(r => r.msgContent.includes('[JOIN_TOURNAMENT'));
		if (tournamentMsgs.length > 0) {
		}
		const history = []
		for (const msg of rows) 
				history.push(msg);
			return history;
	}

	getAllGeneralHistory() {
		return this.statementGetAllGeneralHistory.all();
	}

	deleteMessagesByUserId(userId: number) {
		return this.statementDeleteMessagesByUser.run({ userId });
	}
}