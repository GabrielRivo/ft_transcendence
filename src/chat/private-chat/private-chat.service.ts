import Database, { Statement } from 'better-sqlite3';
import { InjectPlugin, Service } from 'my-fastify-decorators';


@Service()
export class PrivateChatService {
	@InjectPlugin('db')
	private db !: Database.Database;
	private statementSavePrivate !: Statement<{ userId1: number, userId2 : number,  msgContent: string }>;
	private statementGetPrivateHistory !: Statement<{userId1 : number, userId2 : number}>;

	onModuleInit() {
		this.statementSavePrivate = this.db.prepare(
		`INSERT INTO privateChatHistory (userId1, userId2, msgContent) VALUES (@userId1, @userId2, @msgContent)`
		);
		this.statementGetPrivateHistory = this.db.prepare(
			`SELECT * FROM privateChatHistory WHERE (userId1 = @userId1 AND userId2 = @userId2)
				OR (userId2 = @userId2 AND userId1 = @userId1)
					ORDER BY created_at DESC LIMIT 50`
		);
	}
	savePrivateMessage(userId1 : number, userId2 : number, content: string) {
		return this.statementSavePrivate.run({userId1, userId2, msgContent: content });
	}

	getPrivateHistory(user1 : number, user2 : number) {
		const history = this.statementGetPrivateHistory.all({userId1 : user1, userId2 : user2})
		return history.reverse();
	}
}