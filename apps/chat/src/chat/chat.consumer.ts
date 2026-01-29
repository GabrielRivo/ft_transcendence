import { Controller, Inject } from 'my-fastify-decorators';
import { EventPattern, Payload } from 'my-fastify-decorators-microservices';
import { GeneralChatService } from './general-chat/general-chat.service.js';
import { PrivateChatService } from './private-chat/private-chat.service.js';
import { GroupChatService } from './group-chat/group-chat.service.js';

interface UserDeletedPayload {
	id: number;
}

@Controller()
export class ChatConsumer {
	@Inject(GeneralChatService)
	private generalChatService!: GeneralChatService;

	@Inject(PrivateChatService)
	private privateChatService!: PrivateChatService;

	@Inject(GroupChatService)
	private groupChatService!: GroupChatService;

	@EventPattern('user.deleted')
	async handleUserDeleted(@Payload() payload: UserDeletedPayload) {
		const { id } = payload;

		this.generalChatService.anonymizeMessagesByUserId(id);
		this.privateChatService.deleteMessagesByUserId(id);
		this.groupChatService.deleteUserFromGroups(id);
	}
}
