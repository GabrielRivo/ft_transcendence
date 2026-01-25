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
        console.log('[TournamentConsumer] Received tournament.created event:', data);

        // The payload 'data' is the TournamentCreatedEvent object.
        const { name, ownerId, visibility, aggregateId } = data;

        if (name && ownerId) {
            const ownerIdNum = Number(ownerId);
            if (isNaN(ownerIdNum)) {
                console.error(`[TournamentConsumer] Invalid ownerId: ${ownerId}`);
                return;
            }

            console.log(`[TournamentConsumer] Creating group for tournament: ${name}, creator: ${ownerIdNum}`);
            // Use tournament name as group name, maybe prefix it? 
            // The user implies linking them. Same name is good for finding it.
            const result = this.groupService.createGroup(ownerIdNum, name);

            if (result.success) {
                console.log(`[TournamentConsumer] Group created successfully. GroupId: ${result.groupId}`);
            } else {
                console.error(`[TournamentConsumer] Failed to create group: ${result.message}`);
            }
        } else {
            console.warn('[TournamentConsumer] Missing name or ownerId in event data', data);
        }

        if (visibility === 'PUBLIC' && name && aggregateId) {
            console.log(`[TournamentConsumer] Broadcasting public tournament creation: ${name}`);
            const messageContent = `🏆 A new public tournament '${name}' has been created! [JOIN_TOURNAMENT:${aggregateId}]`;
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
        console.log('[TournamentConsumer] Received tournament.cancelled event:', data);
        const { aggregateId, name, ownerId } = data;

        if (name && ownerId) {
            const ownerIdNum = Number(ownerId);
            const group = this.groupService.findGroupByNameAndOwner(ownerIdNum, name);
            if (group) {
                console.log(`[TournamentConsumer] Deleting group ${group.groupId} for cancelled tournament`);
                this.groupService.deleteGroup(group.groupId, ownerIdNum);

                // Notify users in the group (optional, but good practice if still connected)
                // this.io.to(`group_${group.groupId}`).emit('group_deleted', { groupId: group.groupId });
            } else {
                console.warn(`[TournamentConsumer] Group not found for cancelled tournament: ${name}`);
            }
        }

        if (aggregateId) {
            console.log(`[TournamentConsumer] Deleting system message for tournament ${aggregateId}`);
            await this.generalChatService.deleteTournamentSystemMessage(aggregateId);

            // Emit to hub to refresh chat or remove message (if client supports removing specific message)
            // Since we don't have a 'message_deleted' event yet in general chat, we might just rely on reload or next fetch.
            // But we can trigger a refresh if needed.
            this.io.to('hub').emit('invalidate_history');
        }
    }

    @EventPattern('tournament.player_joined')
    async handlePlayerJoined(@Payload() data: { aggregateId: string, playerId: string, name: string, ownerId: string }) {
        console.log('[TournamentConsumer] Received tournament.player_joined event:', data);
        const { playerId, name, ownerId } = data;

        if (name && ownerId) {
            const ownerIdNum = Number(ownerId);
            const playerIdNum = Number(playerId);
            const group = this.groupService.findGroupByNameAndOwner(ownerIdNum, name);

            if (group) {
                // Determine who is "inviting" or adding. Since it's system/tournament logic, 
                // we might need to bypass permission checks or use owner's ID effectively.
                // The groupService.addMember checks permission via 'isMember' usually.
                // However, let's see how addMember is implemented.
                // It checks `const canInvite = this.isMember(groupId, userId);`.
                // We should use the ownerId as the 'userId' performing the add, as they are definitely a member/owner.

                if (ownerId == playerId) {
                    return;
                }
                const result = this.groupService.addMember(group.groupId, ownerIdNum, playerIdNum);

                if (result.success) {
                    console.log(`[TournamentConsumer] Added player ${playerId} to group ${group.groupId}`);
                } else {
                    console.error(`[TournamentConsumer] Failed to add player to group: ${result.message}`);
                }
            } else {
                console.warn(`[TournamentConsumer] Group not found for tournament: ${name}`);
            }
        }
    }

    @EventPattern('tournament.player_left')
    async handlePlayerLeft(@Payload() data: { aggregateId: string, playerId: string, name: string, ownerId: string }) {
        console.log('[TournamentConsumer] Received tournament.player_left event:', data);
        const { playerId, name, ownerId } = data;

        if (name && ownerId) {
            const ownerIdNum = Number(ownerId);
            const playerIdNum = Number(playerId);
            const group = this.groupService.findGroupByNameAndOwner(ownerIdNum, name);

            if (group) {
                const result = this.groupService.removeMember(group.groupId, playerIdNum, playerIdNum);

                if (result.success) {
                    console.log(`[TournamentConsumer] Removed player ${playerId} from group ${group.groupId}`);
                } else {
                    console.error(`[TournamentConsumer] Failed to remove player from group: ${result.message}`);
                }
            } else {
                console.warn(`[TournamentConsumer] Group not found for tournament: ${name}`);
            }
        }
    }
}