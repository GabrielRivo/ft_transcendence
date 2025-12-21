import { Module } from 'my-fastify-decorators';
import { FriendManagementModule } from './friend-management/friend-management.module.js';

@Module({
	imports: [
	FriendManagementModule
],
})
export class AppModule {}
