import Database, { Statement } from 'better-sqlite3';
import { InjectPlugin, Service } from 'my-fastify-decorators';


const Invit = 
	`INSERT INTO friends (userId, otherId, status) 
	VALUES (@userId, @otherId, 'pending')`;

const AcceptInvit = 
	`UPDATE friends 
	SET status = 'accepted' 
	WHERE userId = @otherId AND otherId = @userId AND status = 'pending'`;

const DeleteFromFriendList = 
	`DELETE FROM friends 
	WHERE (userId = @userId AND otherId = @otherId)
	OR (userId = @otherId AND otherId = @userId)`;


@Service()
export class FriendManagementService {
	@InjectPlugin('db')
	private db !: Database.Database;

	private statementInvit : Statement<{
		userId : number, 
		otherId : number,
	}>

	private statementAcceptInvit : Statement<{
		userId : number, 
		otherId : number,
	}>

	private statementDeleteFromFriendList : Statement<{
		userId : number, 
		otherId : number
	}>

	onModuleInit(){
		this.statementInvit = this.db.prepare(Invit);
		this.statementAcceptInvit = this.db.prepare(AcceptInvit);
		this.statementDeleteFromFriendList = this.db.prepare(DeleteFromFriendList);
	}

	async sendInvitation(userId: number, otherId: number) {
		if (userId === otherId)
			throw new Error("Self-friendship");
		try {
			this.statementInvit.run({ userId, otherId });
			return { success: true, message: "Invitation send" };
		}
		catch (error : any) {
			return { success: false, message: "You are already friend with this user or you have already send a invitation" };
		}
	}

	async acceptInvitation(myId: number, senderId: number) {
		const result = this.statementAcceptInvit.run({ userId: myId, otherId: senderId });
		if (result.changes === 0) {
			return { success: false, message: "No invitation pending" };
		}
		return { success: true, message: "Friend added" };
	}

	async deleteFromFriendlist(userId: number, otherId: number) {
		const result = this.statementDeleteFromFriendList.run({ userId, otherId });
		if (result.changes > 0 ) {
			return { success: true, message: "Deleted relationship" }
		}
		return { success: false, message: "This user wasn't in your friendlist or didn't send you a friend request" };
	}
}

