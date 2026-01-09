import { Controller, Get, Inject } from 'my-fastify-decorators';
import { GroupChatService } from './group-chat.service.js';

@Controller('/chat/group')
export class GroupChatController {

	@Inject(GroupChatService)
	private chatService!: GroupChatService;

	@Get('/group_history')
	async get_history() {
		const history = this.chatService.getGroupHistory();
		return history.reverse();
	}
}