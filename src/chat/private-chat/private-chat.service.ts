
import Database, { Statement } from 'better-sqlite3';
import { InjectPlugin, Service } from 'my-fastify-decorators';

const FRIEND_URL = 'http://social:3000';

@Service()
export class PrivateChatService {
	@InjectPlugin('db')
	private db !: Database.Database;
	private statementSavePrivate !: Statement<{ u1: number, u2 : number,  content: string, senderId : string }>;
	private statementGetPrivateHistory !: Statement<{userId1 : number, userId2 : number}>;
	private statementDeleteConversation!: Statement<{ user1: number; user2: number }>;

	onModuleInit() {
		this.statementSavePrivate = this.db.prepare(
		`INSERT INTO privateChatHistory (userId1, userId2, senderId, msgContent) 
				VALUES (MIN(@u1, @u2), MAX(@u1, @u2), @senderId, @content)`
		);
		this.statementGetPrivateHistory = this.db.prepare(
			`SELECT * FROM privateChatHistory WHERE (userId1 = @userId1 AND userId2 = @userId2)
					ORDER BY created_at DESC LIMIT 50`
		);

		this.statementDeleteConversation = this.db.prepare(`
			DELETE FROM privateChatHistory 
			WHERE (userId1 = @user1 AND userId2 = @user2) 
				OR (userId2 = @user1 AND userId1 = @user2)
		`);
	}

	async createPrivateRoom(userId1 : number, userId2 : number) {
	const response = await fetch(`${FRIEND_URL}/social/is_friend`, {
	method: 'POST',
	headers: { 
		'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			userId: userId1, 
			otherId: userId2 
		})
	});
	if (!response)
		return {message : "Error"}
		const isFriend = await response.json();
		if (isFriend == false) {
			return { message: "You are not friend with this user" } 
		}

		const min = Math.min(userId1, userId2)
		const max = Math.max(userId1, userId2)
		return(`room_${min}_${max}`)
	}

	savePrivateMessage(userId1 : number, userId2 : number, content: string, senderId : string) {
		return this.statementSavePrivate.run({u1: userId1, u2: userId2, content: content, senderId});
	}

	async getPrivateHistory(userId1 : number, userId2 : number) {
		const min = Math.min(userId1, userId2)
		const max = Math.max(userId1, userId2)
		const history = this.statementGetPrivateHistory.all({userId1: min, userId2: max})
		return history;
	}
	async removePrivateChat(userId1: number, userId2: number): Promise<void> {
		const test = this.statementDeleteConversation.run({ user1: userId1, user2: userId2 }); 
		console.log(test);
	}
}