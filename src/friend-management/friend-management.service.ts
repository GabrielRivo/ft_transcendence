import Database, { Statement } from 'better-sqlite3';
import { InjectPlugin, Service } from 'my-fastify-decorators';

const addFriendStatement: string = `
INSERT INTO friends (userId, otherId) VALUES (@userId, @otherId);
`;

@Service()
export class FriendManagementService {
	@InjectPlugin('db')
	private db !: Database.Database;

	private statementAddFriend : Statement<{
		userId : number, 
		otherId : number
	}>

	onModuleInit(){
		this.statementAddFriend = this.db.prepare(addFriendStatement);
	}

	add_friend(userId : number, otherId : number) {
		return this.statementAddFriend.run({
			userId,
			otherId,
		})
		// get => readonly
		// run => writeonly
		// all => les 2
	}

	delete_friend(userId : number, otherId : number) {

	}
}
