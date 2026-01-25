import { Body, BodySchema, Controller, Delete, Get, Inject, Param, Post } from 'my-fastify-decorators';
import { CreateGroupDto, CreateGroupSchema, GroupMemberDto, GroupMemberSchema } from './dto/createGroup.dto.js';
import { GroupChatService } from './group-chat.service.js';

@Controller('/group')
export class GroupController {

	@Inject(GroupChatService)
	private groupService!: GroupChatService;

	@Post('/create') 
	@BodySchema(CreateGroupSchema)
	async create_group(@Body() data: CreateGroupDto) {
		return this.groupService.createGroup(data.ownerId, data.name);
	}

	@Get('/my-groups/:userId')
	async get_my_groups(@Param('userId') userId: string) {
		return this.groupService.getUserGroups(Number(userId));
	}

	@Get('/group/:groupId')
	async get_group(@Param('groupId') groupId: string) {
		const group = this.groupService.getGroupById(Number(groupId));
		if (!group) {
			return { success: false, message: "Group not found" };
		}
		const members = this.groupService.getGroupMembers(Number(groupId));
		return { ...group, members };
	}
	@Post('/add_user')
	@BodySchema(GroupMemberSchema)
	async add_member(@Body() data: GroupMemberDto) {
		try {
				return this.groupService.addMember(data.groupId, data.userId, data.otherId)
			} catch (error: any) {
				return { 
					success: false,
					message: error.message || "Failed to send invitation"
				};
		}
	}
	@Post('/remove_member')
	@BodySchema(GroupMemberSchema)
	async remove_member(@Body() data: GroupMemberDto & { removerId: number }) {
		console.log("remove user id :", data.otherId)
		return this.groupService.removeMember(data.groupId, data.userId, data.otherId);
	}

	@Delete('/group')
	async delete_group(@Body() data: { groupId: number; ownerId: number }) {
		return this.groupService.deleteGroup(data.groupId, data.ownerId);
	}
}

