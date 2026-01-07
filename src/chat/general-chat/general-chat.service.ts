import Database, { Statement } from 'better-sqlite3';
import { InjectPlugin, Service } from 'my-fastify-decorators';


@Service()
export class GeneralChatService {
	@InjectPlugin('db')
	private db !: Database.Database;
	private statementSaveGeneral !: Statement<{ userId: number, msgContent: string }>;
	private statementGetGeneralHistory !: Statement<[]>;

	onModuleInit() {
		this.statementSaveGeneral = this.db.prepare(
		`INSERT INTO generalChatHistory (userId, msgContent) VALUES (@userId, @msgContent)`
		);
		this.statementGetGeneralHistory = this.db.prepare(
			`SELECT * FROM generalChatHistory ORDER BY created_at DESC LIMIT 50`
		);
	}
	saveGeneralMessage(userId: number, content: string) {
		return this.statementSaveGeneral.run({ userId, msgContent: content });
	}

	getGeneralHistory() {
		return this.statementGetGeneralHistory.all();
	}
}