import { Module } from 'my-fastify-decorators';
import { ChatGateway } from './chat.gateway.js';
import { ChatConsumer } from './chat.consumer.js';
import { GeneralChatService } from './chat.service.js';
import { GeneralChatController } from './general-chat/general-chat.controller.js';

@Module({
	controllers: [GeneralChatController, ChatConsumer],
	gateways: [ChatGateway],
	providers: [GeneralChatService],
})
export class ChatModule {}
