import { Controller, Get, Inject, Param } from 'my-fastify-decorators';
import { GeneralChatService } from './general-chat.service.js';

@Controller('/chat/general')
export class GeneralChatController {

	@Inject(GeneralChatService)
	private chatService!: GeneralChatService;

	@Get('/history/:userId')
	async get_history(@Param('userId') userId: string) {
		const history = await this.chatService.getGeneralHistory(Number(userId));
		return history.reverse();
	}
}