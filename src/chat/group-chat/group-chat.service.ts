import Database, { Statement } from 'better-sqlite3';
import { InjectPlugin, Service, Inject } from 'my-fastify-decorators';
// import { FriendManagementService } from '../../friend-management/friend-management.service.js'

// `
// <action>     => SELECT
// <?recupere>  => userId, ...
// FROM
// <name>		=> groupMembers
// <condition> => WHERE groupId=@groupId
// `

@Service()
export class GroupChatService {
	@InjectPlugin('db')
	private db !: Database.Database;

	// @Inject(FriendManagementService)
	// private friendService!: FriendManagementService;

	private statementSaveGroup !: Statement<{groupId: number,  userId: number, msgContent: string }>;
	private statementGetGroupHistory !: Statement<{groupId: number}>;
	private statementGetUsersGroup !: Statement<{groupId: number}>;

	private statementAddUserToGroup !: Statement<{userId: number, groupId: number}>;

	onModuleInit() {
		this.statementSaveGroup = this.db.prepare(
		`INSERT INTO groupChatHistory (groupId, userId, msgContent) VALUES (@groupId, @userId, @msgContent)`);
		this.statementGetGroupHistory = this.db.prepare(
			`SELECT * FROM groupChatHistory WHERE groupId = @groupId ORDER BY created_at DESC LIMIT 50`);
		// this.statementGetGroupHistory = this.db.prepare(
		// 	`SELECT * FROM groupChatHistory ORDER BY created_at DESC LIMIT 50`
		// );
		this.statementGetUsersGroup = this.db.prepare(
			`SELECT userId FROM groupMembers WHERE groupId = @groupId`);

		this.statementAddUserToGroup = this.db.prepare(
			`INSERT INTO groupMembers (groupId, userId) VALUES (@groupId, @userId)`);
	}
	
	saveGroupMessage(groupId: number, userId: number, content: string) {
		return this.statementSaveGroup.run({ groupId, userId, msgContent: content });
	}

	getGroupHistory(groupId: number) {
		return this.statementGetGroupHistory.all({ groupId });
	}

	// getGroupHistory() {
	// 	return this.statementGetGroupHistory.all();
	// }

	getUserGroup(groupId : number) {
		console.log('Les ids :', groupId)
		return this.statementGetUsersGroup.all({groupId}) as number[];
	}

	addUserToGroup(senderId : number, userId : number, groupId : number){ // rajouter is_group et is_user
		// if (this.friendService.is_friend(senderId, userId) == null) // AJOUTER LA REQUETE
		// 	return {message : "You aren't friend with this user, can't add to private group"}
		return this.statementAddUserToGroup.run({groupId, userId}) // verifier si on get le group
	}
}

// -> add member to group : pas de pending, auto ajoute dans le group
// -> remove members from group 

// faire une table pour les differents salons
// max users : 16 (tournament)