import { Module } from 'my-fastify-decorators'
import { PrivateChatService } from './private-chat.service.js'

@Module({
	controllers: [],
	providers: [PrivateChatService],
})
export class PrivateChatModule {}
