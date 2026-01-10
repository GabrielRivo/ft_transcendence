import { Body, BodySchema, Controller, Delete, Inject, Post } from 'my-fastify-decorators';
import { FriendManagementService } from './friend-management.service.js';
import { BlockManagementService } from './block-management.service.js';
import { AddFriendSchema, AddFriendDto } from './dto/addFriend.dto.js';

@Controller('/friend-management')
export class FriendManagementController {

	@Inject(FriendManagementService)
	private friend_managementService!: FriendManagementService

	@Inject(BlockManagementService)
	private blockService!: BlockManagementService


	@Post('/invite')
	@BodySchema(AddFriendSchema)
	async send_invitation(@Body() data: AddFriendDto) {
		try {
			const blocked1 = await this.blockService.is_blocked(data.userId, data.otherId);
			const blocked2 = await this.blockService.is_blocked(data.otherId, data.userId);		
			if (blocked1 || blocked2) {
				return { 
					success: false, 
					message: "User blocked, can't add to friendlist" 
				};
			}
		return await this.friend_managementService.sendInvitation(data.userId, data.otherId);
		} 
		catch (error: any) {
			return { success: false, message: error.message };
		}
	}

	@Post('/accept')
	@BodySchema(AddFriendSchema)
	async accept_invitation(@Body() data: AddFriendDto) {
		return this.friend_managementService.acceptInvitation(data.userId, data.otherId);
	}

	@Delete('/friend')
	@BodySchema(AddFriendSchema)
	async delete_friend(@Body() data: AddFriendDto) {
		return this.friend_managementService.deleteFromFriendlist(data.userId, data.otherId)
	}


	@Post('/block')
	@BodySchema(AddFriendSchema)
	async block_user(@Body() data: AddFriendDto) {
		await this.friend_managementService.deleteFromFriendlist(data.userId, data.otherId);
		return this.blockService.block_user(data.userId, data.otherId)
	}

	@Delete('/block')
	@BodySchema(AddFriendSchema)
	async unblock_user(@Body() data: AddFriendDto) {
		return this.blockService.unblock_user(data.userId, data.otherId)
	}
}

	// @Get('/friend/:id')
	// get_friend(@Param("id") id : number){
	// 	return { 
	// 		message : `L'id v2 est ${id}`
	// 	}
	// } 
 
	
		// this.friend_managementService.delete_friend(); 


// @Inject(BlockManagementService)
// private blockService !: BlockManagementService;

// @Post('/block')
// @BodySchema(AddFriendSchema) 
//     return this.blockService.block_user(data.userId, data.otherId);
// }

// @Delete('/block')
// @BodySchema(AddFriendSchema)
// unblock(@Body() data: AddFriendDto) {
//     return this.blockService.unblock_user(data.userId, data.otherId);
// }