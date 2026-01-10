import Database, { Statement } from 'better-sqlite3';
import { Inject, InjectPlugin, Service } from 'my-fastify-decorators';
import { FriendManagementService } from '../../friend-management/friend-management.service.js';


@Service()
export class PrivateChatService {
	@InjectPlugin('db')
	private db !: Database.Database;
	private statementSavePrivate !: Statement<{ userId1: number, userId2 : number,  msgContent: string }>;
	private statementGetPrivateHistory !: Statement<{userId1 : number, userId2 : number}>;

	@Inject(FriendManagementService)
	private friendService!: FriendManagementService;

	onModuleInit() {
		this.statementSavePrivate = this.db.prepare(
		`INSERT INTO privateChatHistory (userId1, userId2, senderId, msgContent) 
				VALUES (MIN(@u1, @u2), MAX(@u1, @u2), @senderId, @content)`
		);
		this.statementGetPrivateHistory = this.db.prepare(
			`SELECT * FROM privateChatHistory WHERE (userId1 = @userId1 AND userId2 = @userId2)
				OR (userId2 = @userId2 AND userId1 = @userId1)
					ORDER BY created_at DESC LIMIT 50`
		);
	}
	

	async createPrivateRoom(userId1 : number, userId2 : number) {
		const isfriend = await this.friendService.is_friend(userId1, userId2);
		if (isfriend == false) {
			return { message: "You are not friend with this user" }
		}

		const min = Math.min(userId1, userId2)
		const max = Math.max(userId1, userId2)
		return(`room_${min}_${max}`)
	}



	savePrivateMessage(userId1 : number, userId2 : number, content: string) {
		return this.statementSavePrivate.run({userId1, userId2, msgContent: content });
	}

	async getPrivateHistory(userId1 : number, userId2 : number) {
		const min = Math.min(userId1, userId2)
		const max = Math.max(userId1, userId2)
		const history = this.statementGetPrivateHistory.all({userId1: min, userId2: max})
		return history.reverse();
	}
}