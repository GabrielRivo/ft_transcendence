import Database, { Statement } from 'better-sqlite3';
import { InjectPlugin, Service, Inject } from 'my-fastify-decorators';
import { FriendManagementService } from '../friend-management/friend-management.service.js';

const blockUserSQL = `INSERT INTO blocklist (userId, otherId) VALUES (@userId, @otherId);`;
const unblockUserSQL = `DELETE FROM blocklist WHERE userId = @userId AND otherId = @otherId;`;
const isBlockedSQL = `SELECT 1 FROM blocklist WHERE userId = @userId AND otherId = @otherId LIMIT 1;`;

@Service()
export class BlockManagementService {
	@InjectPlugin('db')
	private db !: Database.Database;

	@Inject(FriendManagementService)
	private friendService!: FriendManagementService;
	private statementBlock !: Statement<{ userId: number, otherId: number }>;
	private statementUnblock !: Statement<{ userId: number, otherId: number }>;
	private statementIsBlocked !: Statement<{ userId: number, otherId: number }>;

	onModuleInit() {
		this.statementBlock = this.db.prepare(blockUserSQL);
		this.statementUnblock = this.db.prepare(unblockUserSQL);
		this.statementIsBlocked = this.db.prepare(isBlockedSQL);
	}

	block_user(userId: number, otherId: number) {
		if (userId === otherId) {
			return { success: false, message: "You cannot block yourself" };
		}
		try {
			this.friendService.deleteFromFriendlist(userId, otherId)
			this.friendService.deleteFromFriendlist(otherId, userId);
			this.statementBlock.run({ userId, otherId });
			return { success: true, message: "Block user" };
		} catch (e) {
			return { success: false, message: "User already blocked" };
		}
	}

	unblock_user(userId: number, otherId: number) { // mettre une exception : error 300 ? 
		const result = this.statementUnblock.run({ userId, otherId });
		if (result.changes > 0) {
			return { success: true, message: "Unblocked user" };
		} else {
			return { success: false, message: "User was not blocked" };
		}
	}

	async is_blocked(userId: number, otherId: number): Promise <boolean> {
		return !!this.statementIsBlocked.get({ userId, otherId });
	}
}