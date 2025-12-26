import { Controller, Get, Inject } from 'my-fastify-decorators';
import { GeneralChatService } from './general-chat.service.js';

@Controller('/chat/general')
export class GeneralChatController {

	@Inject(GeneralChatService)
	private chatService!: GeneralChatService;

	@Get('/history')
	async get_history() {
		const history = this.chatService.get_history();
		return history;
	}
}