import Database, { Statement } from 'better-sqlite3';
import { Inject, InjectPlugin, Service } from 'my-fastify-decorators';
import { FriendManagementService } from '../friend-management/friend-management.service.js';
import { Server } from 'socket.io';

const blockUserSQL = `INSERT INTO blocklist (userId, otherId) VALUES (@userId, @otherId);`;
const unblockUserSQL = `DELETE FROM blocklist WHERE userId = @userId AND otherId = @otherId;`;
const isBlockedSQL = `SELECT 1 FROM blocklist WHERE userId = @userId AND otherId = @otherId LIMIT 1;`;
const getBlockedUsersSQL = `SELECT otherId FROM blocklist WHERE userId = @userId;`;

const PRIVATE_CHAT_URL = 'http://chat:3000';

@Service()
export class BlockManagementService {
	@InjectPlugin('db')
	private db !: Database.Database;

	@InjectPlugin('io')
	private io!: Server;

	@Inject(FriendManagementService)
	private friendService!: FriendManagementService;
	private statementBlock !: Statement<{ userId: number, otherId: number }>;
	private statementUnblock !: Statement<{ userId: number, otherId: number }>;
	private statementIsBlocked !: Statement<{ userId: number, otherId: number }>;
	private statementGetBlockedUsers !: Statement<{ userId: number }>;

	onModuleInit() {
		this.statementBlock = this.db.prepare(blockUserSQL);
		this.statementUnblock = this.db.prepare(unblockUserSQL);
		this.statementIsBlocked = this.db.prepare(isBlockedSQL);
		this.statementGetBlockedUsers = this.db.prepare(getBlockedUsersSQL);
	}

	block_user(userId: number, otherId: number) {
		if (userId === otherId) {
			return { success: false, message: "You cannot block yourself" };
		}

		try {
			this.friendService.deleteFromFriendlist(userId, otherId)
			this.friendService.deleteFromFriendlist(otherId, userId);
			this.statementBlock.run({ userId, otherId });
			const data = {

			};

			fetch(`${PRIVATE_CHAT_URL}/private/private_history`,
			{
				method: 'DELETE',
				headers : {
					"Content-Type" : "application/json"
				},
				body : JSON.stringify(data)
			});

			// Émettre l'événement user_blocked aux deux utilisateurs
			this.emitToUser(userId, 'user_blocked', { blockedUserId: otherId });
			// this.emitToUser(otherId, 'user_blocked', { blockedUserId: userId });

			return { success: true, message: "Block user" };
		} catch (e) {
			return { success: false, message: "User already blocked" };
		}
	}

	unblock_user(userId: number, otherId: number) {
		if (userId === otherId) {
			return { success: false, message: "You cannot unblock yourself" };
		}
		const result = this.statementUnblock.run({ userId, otherId });
		if (result.changes > 0) {
			// Émettre l'événement user_unblocked aux deux utilisateurs
			this.emitToUser(userId, 'user_unblocked', { unblockedUserId: otherId });
			// this.emitToUser(otherId, 'user_unblocked', { unblockedUserId: userId });

			return { success: true, message: "Unblocked user" };
		} else {
			return { success: false, message: "User was not blocked" };
		}
	}

	async is_blocked(userId: number, otherId: number): Promise<boolean> {
		return !!await this.statementIsBlocked.get({ userId, otherId });
	}

	getBlockedUsers(userId: number): number[] {
		const results = this.statementGetBlockedUsers.all({ userId }) as { otherId: number }[];
		return results.map(row => row.otherId);
	}

	private emitToUser(userId: number, event: string, data: any): void {
		for (const [, socket] of this.io.sockets.sockets) {
			if (socket.data.userId === userId) {
				socket.emit(event, data);
			}
		}
	}
}