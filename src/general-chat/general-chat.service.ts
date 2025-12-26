import Database, { Statement } from 'better-sqlite3';
import { InjectPlugin, Service } from 'my-fastify-decorators';

@Service()
export class GeneralChatService {
	@InjectPlugin('db')
	private db !: Database.Database;
	private statementSave !: Statement<{ userId: number, msgContent: string }>;
	private statementGetHistory !: Statement<[]>;

	onModuleInit() {
		this.statementSave = this.db.prepare(
		`INSERT INTO generalChatHistory (userId, msgContent) VALUES (@userId, @msgContent)`
		);
		this.statementGetHistory = this.db.prepare(
		    `SELECT * FROM generalChatHistory ORDER BY created_at ASC LIMIT 100`
		);
	}

	save_message(userId: number, content: string) {
		return this.statementSave.run({ userId, msgContent: content });
	}

	get_history() {
		return this.statementGetHistory.all();
	}
}