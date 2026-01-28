import { Module } from 'my-fastify-decorators';
import { ChatGateway } from './chat.gateway.js';
import { GeneralChatService } from './chat.service.js';
import { GeneralChatController } from './general-chat/general-chat.controller.js';

@Module({
	controllers: [GeneralChatController],
	gateways: [ChatGateway],
	providers: [GeneralChatService],
})
export class ChatModule {}
