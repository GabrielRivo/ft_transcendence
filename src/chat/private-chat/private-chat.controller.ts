import { Controller, Get, Inject } from 'my-fastify-decorators';
import { PrivateChatService } from './private-chat.service.js';

@Controller('/chat/private')
export class PrivateChatController {

	@Inject(PrivateChatService)
	private chatService!: PrivateChatService;

	@Get('/private_history')
	async get_history() {
		const history = this.chatService.getPrivateHistory();
		return history.reverse();
	}
}