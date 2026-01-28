import { Module } from 'my-fastify-decorators'
import { GeneralChatController } from './general-chat.controller.js'
import { GeneralChatService } from './general-chat.service.js'

@Module({
	controllers: [GeneralChatController],
	providers: [GeneralChatService],
})
export class GeneralChatModule {}
