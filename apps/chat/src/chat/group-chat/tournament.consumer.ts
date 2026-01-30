import { Controller, Inject, InjectPlugin } from 'my-fastify-decorators';
import { EventPattern, Payload } from 'my-fastify-decorators-microservices';
import { GroupChatService } from './group-chat.service.js';
import { GeneralChatService } from '../general-chat/general-chat.service.js';
import { Server } from 'socket.io';

interface TournamentCreatedPayload {
    aggregateId: string;
    name: string;
    ownerId: string;
    // other fields like size, visibility, occurredAt...
    [key: string]: any;
}

@Controller()
export class TournamentConsumer {
    @Inject(GroupChatService)
    private groupService!: GroupChatService;

    @Inject(GeneralChatService)
    private generalChatService!: GeneralChatService;

    @InjectPlugin('io')
    private io!: Server;

    @EventPattern('tournament.created')
    async handleTournamentCreated(@Payload() data: TournamentCreatedPayload) {
        const { name, ownerId, visibility, aggregateId } = data;

        if (name && ownerId) {
            const ownerIdNum = Number(ownerId);
            if (isNaN(ownerIdNum)) {
                return;
            }

            this.groupService.createGroup(ownerIdNum, name);
        }

        if (visibility === 'PUBLIC' && name && aggregateId) {
            const messageContent = `A new public tournament '${name}' has been created! [JOIN_TOURNAMENT:${aggregateId}]`;
            const systemId = -1;
            const systemName = 'System';

            await this.generalChatService.saveGeneralMessage(systemId, systemName, messageContent);

            const messageData = {
                userId: systemId,
                username: systemName,
                msgContent: messageContent,
                roomId: 'hub',
                created_at: new Date().toISOString(),
            };

            this.io.to('hub').emit('message', messageData);
        }
    }

    @EventPattern('tournament.cancelled')
    async handleTournamentCancelled(@Payload() data: { aggregateId: string, name: string, ownerId: string }) {
        const { aggregateId, name, ownerId } = data;

        if (name && ownerId) {
            const ownerIdNum = Number(ownerId);
            const group = this.groupService.findGroupByNameAndOwner(ownerIdNum, name);
            if (group) {
                this.groupService.deleteGroup(group.groupId, ownerIdNum);
            }
        }

        if (aggregateId) {
            await this.generalChatService.deleteTournamentSystemMessage(aggregateId);
            this.io.to('hub').emit('invalidate_history');
        }
    }

    @EventPattern('tournament.player_joined')
    async handlePlayerJoined(@Payload() data: { aggregateId: string, playerId: string, name: string, ownerId: string }) {
        const { playerId, name, ownerId } = data;

        if (name && ownerId) {
            const ownerIdNum = Number(ownerId);
            const playerIdNum = Number(playerId);
            const group = this.groupService.findGroupByNameAndOwner(ownerIdNum, name);

            if (group && ownerId !== playerId) {
                this.groupService.addMember(group.groupId, ownerIdNum, playerIdNum);
            }
        }
    }

    @EventPattern('tournament.player_left')
    async handlePlayerLeft(@Payload() data: { aggregateId: string, playerId: string, name: string, ownerId: string }) {
        const { playerId, name, ownerId } = data;

        if (name && ownerId) {
            const ownerIdNum = Number(ownerId);
            const playerIdNum = Number(playerId);
            const group = this.groupService.findGroupByNameAndOwner(ownerIdNum, name);

            if (group && ownerId !== playerId) {
                this.groupService.removeMember(group.groupId, playerIdNum, playerIdNum);
            }
        }
    }

    @EventPattern('tournament.finished')
    async handleTournamentFinished(@Payload() data: { aggregateId: string, winnerId: string, name: string, ownerId: string }) {
        const { aggregateId, name, ownerId } = data;

        if (name && ownerId) {
            const ownerIdNum = Number(ownerId);
            const group = this.groupService.findGroupByNameAndOwner(ownerIdNum, name);

            if (group) {
                this.groupService.deleteGroup(group.groupId, ownerIdNum);
            }
        }

        if (aggregateId) {
            await this.generalChatService.deleteTournamentSystemMessage(aggregateId);
            this.io.to('hub').emit('invalidate_history');
        }
    }
}