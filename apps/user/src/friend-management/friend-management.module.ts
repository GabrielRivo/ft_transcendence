import { Module } from 'my-fastify-decorators'
import { FriendManagementController } from './friend-management.controller.js'
import { FriendManagementService } from './friend-management.service.js'

@Module({
	controllers: [FriendManagementController],
	providers: [FriendManagementService],
})
export class FriendManagementModule {}
