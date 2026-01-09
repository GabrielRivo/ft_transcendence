import { Module } from 'my-fastify-decorators'
import { PrivateChatController } from './private-chat.controller.js'
import { PrivateChatService } from './private-chat.service.js'

@Module({
	controllers: [PrivateChatController],
	providers: [PrivateChatService],
})
export class PrivateChatModule {}
