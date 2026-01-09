import Database, { Statement } from 'better-sqlite3';
import { InjectPlugin, Service } from 'my-fastify-decorators';


@Service()
export class GroupChatService {
	@InjectPlugin('db')
	private db !: Database.Database;
	private statementSaveGroup !: Statement<{ userId: number, msgContent: string }>;
	private statementGetGroupHistory !: Statement<[]>;

	onModuleInit() {
		this.statementSaveGroup = this.db.prepare(
		`INSERT INTO groupChatHistory (userId, msgContent) VALUES (@userId, @msgContent)`
		);
		this.statementGetGroupHistory = this.db.prepare(
			`SELECT * FROM groupChatHistory ORDER BY created_at DESC LIMIT 50`
		);
	}
	saveGeneralMessage(userId: number, content: string) {
		return this.statementSaveGroup.run({ userId, msgContent: content });
	}

	getGroupHistory() {
		return this.statementGetGroupHistory.all();
	}
}

// -> add member to group : pas de pending, auto ajoute dans le group
// -> remove members from group 

// faire une table pour les differents salons
// max users : 16 (tournament)