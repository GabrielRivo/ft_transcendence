import { Module } from 'my-fastify-decorators';
import { ChatGateway } from './chat.gateway.js';
import { ChatConsumer } from './chat.consumer.js';
import { GeneralChatService } from './chat.service.js';

@Module({
	controllers: [ChatConsumer],
	gateways: [ChatGateway],
	providers: [GeneralChatService],
})
export class ChatModule {}
