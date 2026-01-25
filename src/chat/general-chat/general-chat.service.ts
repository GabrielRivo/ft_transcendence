import Database, { Statement } from 'better-sqlite3';
import { InjectPlugin, Service, Inject } from 'my-fastify-decorators';

const BLOCK_URL = 'http://social:3000';

@Service()
export class GeneralChatService {
	@InjectPlugin('db')
	private db !: Database.Database;
	private statementSaveGeneral !: Statement<{ userId: number, username: string, msgContent: string }>;
	private statementGetGeneralHistory !: Statement<[]>;
	private statementGetAllGeneralHistory !: Statement<[]>;

	onModuleInit() {
		this.statementSaveGeneral = this.db.prepare(
		`INSERT INTO generalChatHistory (userId, username, msgContent) VALUES (@userId, @username, @msgContent)`
		);
		this.statementGetGeneralHistory = this.db.prepare(
			`SELECT * FROM generalChatHistory ORDER BY created_at DESC LIMIT 50`
		);
		this.statementGetAllGeneralHistory = this.db.prepare(
			`SELECT * FROM generalChatHistory ORDER BY created_at DESC LIMIT 100`);
	}
	async saveGeneralMessage(userId: number, username: string, content: string) {
		try {
		return this.statementSaveGeneral.run({ userId, username, msgContent: content });
		}
		catch(e) {
			console.log(e)
			return null;
		}
	}

	async getGeneralHistory(currentUserId: number) {
		const rows = this.statementGetGeneralHistory.all() as any[];
		const filteredHistory = []; 
		for (const msg of rows) {
			const res = await fetch(`${BLOCK_URL}/friend-management/block?userId=${currentUserId}&otherId=${msg.userId}`);
			if (!res.ok) {
				console.error(`Error with friend service ${res.status}`);
			}
			else {
				const data = await res.json() as { isBlocked: boolean };
				if (data.isBlocked === false) {
					filteredHistory.push(msg);
				}
			}
		}
		return filteredHistory;
	}

	getAllGeneralHistory(){
		return this.statementGetAllGeneralHistory.all();
	}
}