import { Module } from 'my-fastify-decorators'
import { GeneralChatService } from './general-chat.service.js'

@Module({
	controllers: [],
	providers: [GeneralChatService],
})
export class GeneralChatModule {}
