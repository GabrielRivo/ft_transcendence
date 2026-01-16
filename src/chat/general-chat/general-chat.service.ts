import Database, { Statement } from 'better-sqlite3';
import { InjectPlugin, Service, Inject } from 'my-fastify-decorators';
// import { BlockManagementService } from '../../friend-management/block-management.service.js';


@Service()
export class GeneralChatService {
	@InjectPlugin('db')
	private db !: Database.Database;
	private statementSaveGeneral !: Statement<{ userId: number, username: string, msgContent: string }>;
	private statementGetGeneralHistory !: Statement<[]>;
	private statementGetAllGeneralHistory !: Statement<[]>;


	// @Inject(BlockManagementService)
	// private blockService!: BlockManagementService;

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
			//const blocked = await this.blockService.is_blocked(currentUserId, msg.userId); // FAIRE LA REQUETE 
			//if (!blocked) {
				filteredHistory.push(msg);
			//}
		}
		return filteredHistory;
	}

	getAllGeneralHistory(){
		return this.statementGetAllGeneralHistory.all();
	}
}
// return this.statementGetGeneralHistory.all();

// faire un clear history a + de 100 messages
// faire un afficher history pour quand les users rejoignent le chat 
