import { Module } from 'my-fastify-decorators';
import { GroupController as GroupChatController } from './group-chat.controller.js';
import { GroupChatService } from './group-chat.service.js';
import { TournamentConsumer } from './tournament.consumer.js';

@Module({
	controllers: [GroupChatController, TournamentConsumer],
	providers: [GroupChatService],
})
export class GroupChatModule { }
