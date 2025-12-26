import Database, { Statement } from 'better-sqlite3';
import { InjectPlugin, Service } from 'my-fastify-decorators';

const blockUserSQL = `INSERT INTO blocklist (userId, otherId) VALUES (@userId, @otherId);`;
const unblockUserSQL = `DELETE FROM blocklist WHERE userId = @userId AND otherId = @otherId;`;
const isBlockedSQL = `SELECT 1 FROM blocklist WHERE userId = @userId AND otherId = @otherId LIMIT 1;`;

@Service()
export class BlockManagementService {
	@InjectPlugin('db')
	private db !: Database.Database;

	private statementBlock !: Statement<{ userId: number, otherId: number }>;
	private statementUnblock !: Statement<{ userId: number, otherId: number }>;
	private statementIsBlocked !: Statement<{ userId: number, otherId: number }>;

	onModuleInit() {
		this.statementBlock = this.db.prepare(blockUserSQL);
		this.statementUnblock = this.db.prepare(unblockUserSQL);
		this.statementIsBlocked = this.db.prepare(isBlockedSQL);
	}

	block_user(userId: number, otherId: number) {
		try {
			this.statementBlock.run({ userId, otherId });
			return { success: true, message: "Utilisateur bloqué" };
		} catch (e) {
			return { success: false, message: "Déjà bloqué ou erreur" };
		}
	}

	unblock_user(userId: number, otherId: number) {
		const result = this.statementUnblock.run({ userId, otherId });
		return { success: result.changes > 0 };
	}

	is_blocked(userId: number, otherId: number): boolean {
		return !!this.statementIsBlocked.get({ userId, otherId });
	}
}