import Database, { Statement } from 'better-sqlite3';
import { InjectPlugin, Service } from 'my-fastify-decorators';


@Service()
export class PrivateChatService {
	@InjectPlugin('db')
	private db !: Database.Database;
	private statementSavePrivate !: Statement<{ userId: number, msgContent: string }>;
	private statementGetPrivateHistory !: Statement<[]>;

	onModuleInit() {
		this.statementSavePrivate = this.db.prepare(
		`INSERT INTO privateChatHistory (userId, msgContent) VALUES (@userId, @msgContent)`
		);
		this.statementGetPrivateHistory = this.db.prepare(
			`SELECT * FROM privateChatHistory ORDER BY created_at DESC LIMIT 50`
		);
	}
	savePrivateMessage(userId: number, content: string) {
		return this.statementSavePrivate.run({ userId, msgContent: content });
	}

	getPrivateHistory() {
		return this.statementGetPrivateHistory.all();
	}
}