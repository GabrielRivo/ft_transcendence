import { Body, BodySchema, Controller, Delete, Get, Inject, Param, Post, JWTBody } from 'my-fastify-decorators';
import { CreateGroupDto, CreateGroupSchema, GroupMemberDto, GroupMemberSchema } from './dto/createGroup.dto.js';
import { GroupChatService } from './group-chat.service.js';

@Controller('/group')
export class GroupController {

	@Inject(GroupChatService)
	private groupService!: GroupChatService;

	@Post('/create') 
	@BodySchema(CreateGroupSchema)
	async create_group(@Body() data: CreateGroupDto, @JWTBody() user: { id: number }) {
		return this.groupService.createGroup(user.id, data.name);
	}

	@Get('/my-groups/')
	async get_my_groups(@JWTBody() user: { id: number }) {
		return this.groupService.getUserGroups(Number(user.id));
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
	async add_member(@Body() data: GroupMemberDto, @JWTBody() user: { id: number }) {
		try {
				return this.groupService.addMember(data.groupId, user.id, data.otherId)
			} catch (error: any) {
				return { 
					success: false,
					message: error.message || "Failed to send invitation"
				};
		}
	}
	@Post('/remove_member')
	@BodySchema(GroupMemberSchema)
	async remove_member(@Body() data: GroupMemberDto & { removerId: number }, @JWTBody() user: { id: number }) {
		console.log("remove user id :", data.otherId)
		return this.groupService.removeMember(data.groupId, user.id, data.otherId);
	}

	@Delete('/group')
	async delete_group(@Body() data: { groupId: number}, @JWTBody() user: { id: number }) {
		return this.groupService.deleteGroup(data.groupId, user.id);
	}
}

