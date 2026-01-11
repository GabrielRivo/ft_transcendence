import { Controller, Get, Inject, Param } from 'my-fastify-decorators';
import { PrivateChatService } from './private-chat.service.js';

@Controller('/chat/private')
export class PrivateChatController {

	@Inject(PrivateChatService)
	private chatService!: PrivateChatService;

	@Get('/private_history')
	async get_history(@Param('userId1') userId1: string , @Param('userId2') userId2: string) {
			const history = await this.chatService.getPrivateHistory(Number(userId1), Number(userId2));
			return history.reverse();
	}
}