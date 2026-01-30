import Database, { Statement } from 'better-sqlite3';
import { InjectPlugin, Service } from 'my-fastify-decorators';
import { Server } from 'socket.io';

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
	INNER JOIN groupMembers m ON g.groupId = m.groupId
	WHERE m.userId = @userId
	GROUP BY g.groupId ORDER BY g.created_at DESC LIMIT 50`;

const GetGroupById =
	`SELECT groupId, name, ownerId, created_at FROM privateGroup WHERE groupId = @groupId`;

const DeleteGroup =
	`DELETE FROM privateGroup WHERE groupId = @groupId AND ownerId = @ownerId`;

const IsMember =
	`SELECT 1 FROM groupMembers WHERE groupId = @groupId AND userId = @userId`;

const GetGrpHistory =
	`SELECT * FROM groupChatHistory WHERE groupId = @groupId ORDER BY created_at DESC LIMIT 50`

const FindGroupByNameAndOwner =
	`SELECT groupId FROM privateGroup WHERE ownerId = @ownerId AND name = @name`;

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
	private statemenGetGroupHistory: Statement<{ groupId: number, userId: number }>;
	private statementSaveGroupMessage: Statement<{ groupId: number, userId: number, msgContent: string }>;
	private statementFindGroupByNameAndOwner: Statement<{ ownerId: number, name: string }>;

	private statementDeleteGroupMembersByUser!: Statement<{ userId: number }>;
	private statementAnonymizeGroupMessagesByUser!: Statement<{ userId: number }>;
	private statementDeleteGroupsByOwner!: Statement<{ ownerId: number }>;

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
		this.statementFindGroupByNameAndOwner = this.db.prepare(FindGroupByNameAndOwner);

		this.statementDeleteGroupMembersByUser = this.db.prepare(
			`DELETE FROM groupMembers WHERE userId = @userId`
		);
		this.statementAnonymizeGroupMessagesByUser = this.db.prepare(
			`UPDATE groupChatHistory SET userId = 0 WHERE userId = @userId`
		);
		this.statementDeleteGroupsByOwner = this.db.prepare(
			`DELETE FROM privateGroup WHERE ownerId = @ownerId`
		);
	}

	createGroup(ownerId: number, name: string): { success: boolean; message: string; groupId?: number } {
		try {
			const result = this.statementCreateGroup.run({ name, ownerId });
			const groupId = Number(result.lastInsertRowid);

			this.statementAddMember.run({ groupId, userId: ownerId });

			this.emitToUser(ownerId, 'group_list_update', {});

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
			this.statementAddMember.run({ groupId, userId: otherId });
		} catch (error: any) {
			return { success: false, message: "User is already a member" };
		}
		this.emitToUser(userId, 'group_invite', { groupId });
		this.emitToUser(otherId, 'group_list_update', {});
		return { success: true, message: "Member added" };
	}

	removeMember(groupId: number, userId: number, otherId: number): { success: boolean; message: string } {
		const group = this.getGroupById(groupId);
		if (!group) {
			return { success: false, message: "Group not found" };
		}

		if (otherId != userId) {
			return { success: false, message: "You don't have permission to remove this member" };
		}

		const result = this.statementRemoveMember.run({ groupId, userId: otherId });
		if (result.changes === 0) {
			return { success: false, message: "User is not a member" };
		}

		this.emitToUser(otherId, 'group_list_update', {});
		return { success: true, message: "Member removed" };
	}

	getUserGroups(userId: number): Group[] {
		return this.statementGetUserGroups.all({ userId }) as Group[];
	}

	getGroupMembers(groupId: number): number[] {
		const rows = this.statementGetGroupMembers.all({ groupId }) as { userId: number } [];
		return rows.map(r => r.userId);
	}

	getGroupById(groupId: number): Group | undefined {
		return this.statementGetGroupById.get({ groupId }) as Group | undefined;
	}

	isMember(groupId: number, userId: number): boolean {
		if (!!this.statementGetGroupById.get({ groupId })) {
			return !!this.statementIsMember.get({ groupId, userId });
		}
		return false;
	}

	deleteGroup(groupId: number, ownerId: number): { success: boolean; message: string } {
		const members = this.getGroupMembers(groupId);
		const result = this.statementDeleteGroup.run({ groupId, ownerId });
		if (result.changes === 0) {
			return { success: false, message: "Group not found or you are not the owner" };
		}

		// Notify all members including owner
		const allToNotify = new Set([...members, ownerId]);
		allToNotify.forEach(userId => {
			this.emitToUser(userId, 'group_list_update', {});
		});

		return { success: true, message: "Group deleted" };
	}

	findGroupByNameAndOwner(ownerId: number, name: string): { groupId: number } | undefined {
		return this.statementFindGroupByNameAndOwner.get({ ownerId, name }) as { groupId: number } | undefined;
	}

	private emitToUser(userId: number, event: string, data: any): void {
		for (const [, socket] of this.io.sockets.sockets) {
			if (socket.data.userId === userId) {
				socket.emit(event, data);
			}
		}
	}

	async getGroupHistory(groupId: number, userId: number) {
		return this.statemenGetGroupHistory.all({ groupId, userId }) as any[];
	}

	saveGroupMessage(groupId: number, userId: number, content: string) {
		return this.statementSaveGroupMessage.run({ groupId, userId, msgContent: content });
	}


	deleteUserFromGroups(userId: number) {
		this.statementDeleteGroupMembersByUser.run({ userId });
		this.statementAnonymizeGroupMessagesByUser.run({ userId });
		this.statementDeleteGroupsByOwner.run({ ownerId: userId });
	}
}
