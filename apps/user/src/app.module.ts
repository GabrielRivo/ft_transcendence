import { Module } from 'my-fastify-decorators';
import { FriendManagementModule } from './friend-management/friend-management.module.js';
import { UserModule } from './user/user.module.js';

@Module({
	imports: [
		FriendManagementModule,
		UserModule
	],
})
export class AppModule {}
