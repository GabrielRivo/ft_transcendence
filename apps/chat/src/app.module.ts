import { Module } from 'my-fastify-decorators';
import { ChatModule } from './chat/chat.module.js';
import { GroupChatModule } from './chat/group-chat/group-chat.module.js'
import { PrivateChatModule } from './chat/private-chat/private-chat.module.js';


@Module({
	imports: [
		ChatModule,
		PrivateChatModule,
		GroupChatModule
	],
})
export class AppModule {}
