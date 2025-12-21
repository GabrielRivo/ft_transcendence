import { Body, Controller, Delete, Inject, Post } from 'my-fastify-decorators';
import { FriendManagementService } from './friend-management.service.js';

@Controller('/friend-management')
export class FriendManagementController {
	@Inject(FriendManagementService)
	private friend_managementService !: FriendManagementService;

	@Post('/friend')
	add_friend(@Body() data : {userId : number, otherId : number}) {
		try {
			this.friend_managementService.add_friend(data.userId, data.otherId);
		} catch (e) {
			console.log(e)
		}
	}

	@Delete('/friend')
	delete_friend(@Body() data : {userId : number, otherId : number}) {
		// this.friend_managementService.delete_friend();
	}
}    