import { Controller, Get, Inject } from 'my-fastify-decorators';
import { GeneralChatService } from './general-chat.service.js';

@Controller('/chat/general')
export class GeneralChatController {

	@Inject(GeneralChatService)
	private chatService!: GeneralChatService;

	@Get('/history/all')
	get_full_history() {
		const history = this.chatService.getAllGeneralHistory();
		return history.reverse();
	}

	@Get('/history/:userId')
	async get_history() {
		const history = await this.chatService.getGeneralHistory();
		return history.reverse();
	}

}