import { Body, BodySchema, Controller, Delete, Get, Inject, JWTBody, Param, Post, Query, QuerySchema } from 'my-fastify-decorators';
import { BlockManagementService } from './block-management.service.js';
import { AddFriendDto, AddFriendSchema } from './dto/addFriend.dto.js';
import { InviteByUsernameDto, InviteByUsernameSchema } from './dto/inviteByUsername.dto.js';
import { FriendManagementService } from './friend-management.service.js';


import { FriendManagementDto, FriendManagementSchema } from './dto/addFriend.dto.js';

@Controller('/friend-management')
export class FriendManagementController {
	@Inject(FriendManagementService)
	private friend_managementService!: FriendManagementService;

	@Inject(BlockManagementService)
	private blockService!: BlockManagementService;

	@Post('/invite-by-username')
	@BodySchema(InviteByUsernameSchema)
	async invite_by_username(@Body() data: InviteByUsernameDto) {
		try {
			const targetUserId = this.friend_managementService.getUserIdByUsername(data.targetUsername);

			if (targetUserId === null) {
				return { success: false, message: "User not found" };
			}

			const [blocked1, blocked2] = await Promise.all([
				this.blockService.is_blocked(data.userId, targetUserId),
				this.blockService.is_blocked(targetUserId, data.userId)
			]);

			if (blocked1) {
				return { success: false, message: "User blocked, can't add to friendlist" };
			}
			if (blocked2) {
				return { success: false, message: "You can't add this user" };
			}

			return this.friend_managementService.sendInvitation(data.userId, targetUserId, data.senderUsername);
		} catch (error: any) {
			return { success: false, message: error.message || "Failed to send invitation" };
		}
	}

	@Post('/invite')
	@BodySchema(FriendManagementSchema)
	async send_invitation(@Body() data: FriendManagementDto, @JWTBody() user: { id: number; username: string }) {
		try {
			const [blocked1, blocked2] = await Promise.all([
				this.blockService.is_blocked(user.id, data.otherId),
				this.blockService.is_blocked(data.otherId, user.id)
			]);

			if (blocked1) {
				return { success: false, message: "User blocked, can't add to friendlist" };
			}
			if (blocked2) {
				return { success: false, message: "You can't add this user" };
			}
			return this.friend_managementService.sendInvitation(user.id, data.otherId, user.username);
		} catch (error: any) {
			return { success: false, message: error.message };
		}
	}

	@Post('/accept')
	@BodySchema(AddFriendSchema)
	async accept_invitation(@Body() data: AddFriendDto, @JWTBody() user: { id: number; username: string }) {
		return this.friend_managementService.acceptInvitation(user.id, data.otherId, user.username);
	}

	@Delete('/accept')
	@BodySchema(AddFriendSchema)
	async decline_invitation(@Body() data: AddFriendDto, @JWTBody() user: { id: number; username: string }) {
		return this.friend_managementService.declineInvitation(user.id, data.otherId, user.username);
	}

	@Get('/pending/:userId')
	get_pending_invitations(@Param('userId') userId: string) {
		return this.friend_managementService.getPendingInvitations(Number(userId));
	}

	@Get('/friends/:userId')
	get_friends(@Param('userId') userId: string) {
		return this.friend_managementService.getFriends(Number(userId));
	}

	@Delete('/friend')
	@BodySchema(FriendManagementSchema)
	async delete_friend(@Body() data: FriendManagementDto, @JWTBody() user: { id: number }) {
		return this.friend_managementService.deleteFromFriendlist(user.id, data.otherId);
	}

	@Post('/block')
	@BodySchema(FriendManagementSchema)
	async block_user(@Body() data: FriendManagementDto, @JWTBody() user: { id: number }) {
		// this.friend_managementService.deleteFromFriendlist(user.id, data.otherId);
		return this.blockService.block_user(user.id, data.otherId);
	}

	@Delete('/block')
	@BodySchema(AddFriendSchema)
	async unblock_user(@Body() data: AddFriendDto) {
		return this.blockService.unblock_user(data.userId, data.otherId);
	}

	@Get('/block')
	@QuerySchema(AddFriendSchema)
	async is_blocked(@Query() data: AddFriendDto) {
		return {
			isBlocked: await this.blockService.is_blocked(data.userId, data.otherId)
		}
	}

	@Get('/blocked-list')
	async get_blocked_list(@JWTBody() user: { id: number }) {
		return { blockedIds: this.blockService.getBlockedUsers(user.id) };
	}

	@Post('/challenge')
	@BodySchema(FriendManagementSchema)
	async send_challenge(@Body() data: FriendManagementDto, @JWTBody() user: { id: number; username: string }) {
		try {
			const [blocked1, blocked2] = await Promise.all([
				this.blockService.is_blocked(user.id, data.otherId),
				this.blockService.is_blocked(data.otherId, user.id)
			]);

			if (blocked1) {
				return { success: false, message: "User blocked, can't challenge" };
			}
			if (blocked2) {
				return { success: false, message: "You can't challenge this user" };
			}
			return this.friend_managementService.sendChallenge(user.id, data.otherId, user.username);
		} catch (error: any) {
			return { success: false, message: error.message };
		}
	}

	@Get('/challenge')
	async get_challenge(@JWTBody() user: { id: number; username: string }, @Query() query: { otherId: string }) {
		const targetId = Number(query.otherId);
		return this.friend_managementService.getChallenge(user.id, targetId, user.username);
	}

	@Post('/accept_challenge')
	@BodySchema(FriendManagementSchema)
	async accept_challenge(@Body() data: AddFriendDto, @JWTBody() user: { id: number; username: string }) {
		return await this.friend_managementService.acceptChallenge(user.id, data.otherId, user.username);
	}

	@Post('/delete_match')
	@BodySchema(FriendManagementSchema)
	async delete_match(@Body() data: AddFriendDto, @JWTBody() user: { id: number }) {
		return this.friend_managementService.deleteMatch(user.id, data.otherId);
	}
}

