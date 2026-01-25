import Database, { Statement } from 'better-sqlite3';
import { InjectPlugin, Service } from 'my-fastify-decorators';
import { Server } from 'socket.io';

const BLOCK_URL = 'http://social:3000';

const CreateGroup = 
	`INSERT INTO privateGroup (name, ownerId) VALUES (@name, @ownerId)`;

const AddMember = 
	`INSERT INTO groupMembers (groupId, userId) VALUES (@groupId, @userId)`;

const RemoveMember = 
	`DELETE FROM groupMembers WHERE groupId = @groupId AND userId = @userId`;

const GetGroupMembers = 
	`SELECT userId FROM groupMembers WHERE groupId = @groupId`;

const GetUserGroups = 
	`SELECT g.groupId, g.name, g.ownerId, g.created_at
	FROM privateGroup g
	LEFT JOIN groupMembers m ON g.groupId = m.groupId
	WHERE g.ownerId = @userId OR m.userId = @userId
	GROUP BY g.groupId`;

const GetGroupById = 
	`SELECT groupId, name, ownerId, created_at FROM privateGroup WHERE groupId = @groupId`;

const DeleteGroup = 
	`DELETE FROM privateGroup WHERE groupId = @groupId AND ownerId = @ownerId`;

const IsMember = 
	`SELECT 1 FROM groupMembers WHERE groupId = @groupId AND userId = @userId
	UNION SELECT 1 FROM privateGroup WHERE groupId = @groupId AND ownerId = @userId`;

const GetGrpHistory = 
	`SELECT * FROM groupChatHistory WHERE groupId = @groupId ORDER BY created_at DESC LIMIT 50`

const SaveGroupMessage =
	`INSERT INTO groupChatHistory (groupId, userId, msgContent) VALUES (@groupId, @userId, @msgContent)`

export interface Group {
	groupId: number;
	name: string;
	ownerId: number;
	created_at: string;
}

@Service()
export class GroupChatService {
	@InjectPlugin('db')
	private db!: Database.Database;

	@InjectPlugin('io')
	private io!: Server;

	private statementCreateGroup: Statement<{ name: string; ownerId: number }>;
	private statementAddMember: Statement<{ groupId: number; userId: number }>;
	private statementRemoveMember: Statement<{ groupId: number; userId: number }>;
	private statementGetGroupMembers: Statement<{ groupId: number }>;
	private statementGetUserGroups: Statement<{ userId: number }>;
	private statementGetGroupById: Statement<{ groupId: number }>;
	private statementDeleteGroup: Statement<{ groupId: number; ownerId: number }>;
	private statementIsMember: Statement<{ groupId: number; userId: number }>;
	private statemenGetGroupHistory: Statement<{ groupId: number, userId : number }>;
	private statementSaveGroupMessage: Statement<{ groupId: number,  userId: number, msgContent: string }>;

	onModuleInit() {
		this.statementCreateGroup = this.db.prepare(CreateGroup);
		this.statementAddMember = this.db.prepare(AddMember);
		this.statementRemoveMember = this.db.prepare(RemoveMember);
		this.statementGetGroupMembers = this.db.prepare(GetGroupMembers);
		this.statementGetUserGroups = this.db.prepare(GetUserGroups);
		this.statementGetGroupById = this.db.prepare(GetGroupById);
		this.statementDeleteGroup = this.db.prepare(DeleteGroup);
		this.statementIsMember = this.db.prepare(IsMember);
		this.statemenGetGroupHistory = this.db.prepare(GetGrpHistory);
		this.statementSaveGroupMessage = this.db.prepare(SaveGroupMessage);
	}

	createGroup(ownerId: number, name: string): { success: boolean; message: string; groupId?: number } {
		try {
			const result = this.statementCreateGroup.run({ name, ownerId });
			const groupId = Number(result.lastInsertRowid);
			
			this.statementAddMember.run({ groupId, userId: ownerId });
			
			return { success: true, message: "Group created", groupId };
		} catch (error: any) {
			return { success: false, message: error.message || "Failed to create group" };
		}
	}

	addMember(groupId: number, userId: number, otherId: number): { success: boolean; message: string } {
		const canInvite = this.isMember(groupId, userId);
		if (!canInvite) {
			return { success: false, message: "You haven't the permission to invite!" };
		}
		
		const members = this.getGroupMembers(groupId);
		if (members.length >= 16) {
			return { success: false, message: "Group is full (max 16 members)" };
		}
		
		try {
			this.statementAddMember.run({ groupId, userId : otherId });
		} catch (error: any) {
			console.log(error);
			return { success: false, message: "User is already a member" };
		}
		this.emitToUser(userId, 'group_invite', { groupId });
		return { success: true, message: "Member added" };
	}

	removeMember(groupId: number, userId: number, otherId: number): { success: boolean; message: string } {
		const group = this.getGroupById(groupId);
		if (!group) {
			return { success: false, message: "Group not found" };
		}

		if (otherId != userId) {
			console.log("user : ", userId, "leave")
			return { success: false, message: "You don't have permission to remove this member" };
		}
		
		const result = this.statementRemoveMember.run({ groupId, userId: otherId });
		if (result.changes === 0) {
			return { success: false, message: "User is not a member" };
		}
		
		return { success: true, message: "Member removed" };
	}

	getUserGroups(userId: number): Group[] {
		return this.statementGetUserGroups.all({ userId }) as Group[];
	}

	getGroupMembers(groupId: number): number[] {
		const rows = this.statementGetGroupMembers.all({ groupId }) as { userId: number }[];
		return rows.map(r => r.userId);
	}

	getGroupById(groupId: number): Group | undefined {
		return this.statementGetGroupById.get({ groupId }) as Group | undefined;
	}

	isMember(groupId: number, userId: number): boolean {
		if (!!this.statementGetGroupById.get({groupId})){
			return !!this.statementIsMember.get({ groupId, userId });
		}
		return false;
	}

	deleteGroup(groupId: number, ownerId: number): { success: boolean; message: string } {
		const result = this.statementDeleteGroup.run({ groupId, ownerId });
		if (result.changes === 0) {
			return { success: false, message: "Group not found or you are not the owner" };
		}
		return { success: true, message: "Group deleted" };
	}

	private emitToUser(userId: number, event: string, data: any): void {
		for (const [, socket] of this.io.sockets.sockets) {
			if (socket.data.userId === userId) {
				socket.emit(event, data);
			}
		}
	}

	async getGroupHistory(groupId: number, userId : number) {
		const rows = this.statemenGetGroupHistory.all({ groupId, userId }) as any[];
		const filteredHistory = [];
		for (const msg of rows) {
			console.log("mess : ", userId, msg.userId)
			const res = await fetch(`${BLOCK_URL}/friend-management/block?userId=${userId}&otherId=${msg.userId}`);
			if (!res.ok) {
				console.error(`Error with friend service ${res.status}`);
			}
			else {
				const data = await res.json() as { isBlocked: boolean };
				if (data.isBlocked === false) {
					console.log("false")
					filteredHistory.push(msg);
				}
			}
		}
		return filteredHistory;
	}

	saveGroupMessage(groupId: number, userId: number, content: string) {
		return this.statementSaveGroupMessage.run({ groupId, userId, msgContent: content });
	}
}

