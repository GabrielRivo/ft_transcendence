import { IsRequired, IsString, MaxLength, MinLength, generateSchema } from 'my-class-validator';
import {
    ConnectedSocket,
    Inject,
    JWTBody,
    MessageBody,
    SocketSchema,
    SubscribeMessage,
    WebSocketGateway,
} from 'my-fastify-decorators';
import { Socket } from 'socket.io';
import { JoinTournamentDto } from '../../application/dtos/join-tournament.dto.js';
import { JoinTournamentUseCase } from '../../application/use-cases/join-tournament.use-case.js';

export class JoinTournamentPayload {
    @IsString()
    @IsRequired()
    tournamentId!: string;

    @IsString()
    @IsRequired()
    @MinLength(1)
    @MaxLength(20)
    displayName!: string;
}

@WebSocketGateway()
export class TournamentGateway {
    @Inject(JoinTournamentUseCase)
    private joinUseCase!: JoinTournamentUseCase;

    @SubscribeMessage('join_tournament')
    @SocketSchema(generateSchema(JoinTournamentPayload))
    public async handleJoin(
        @ConnectedSocket() socket: Socket,
        @MessageBody() payload: JoinTournamentPayload,
        @JWTBody() user: any
    ) {
        console.log(`[TournamentGateway] Received join_tournament request for ${payload.tournamentId} from ${user ? user.id : socket.id}`);
        const isGuest = !user;
        const userId = isGuest ? socket.id : user.id;

        const command = new JoinTournamentDto();
        command.displayName = payload.displayName;

        try {
            await this.joinUseCase.execute(payload.tournamentId, command, userId, isGuest);
            const roomId = `tournament:${payload.tournamentId}`;
            await socket.join(roomId);
            console.log(`[TournamentGateway] User ${userId} joined room ${roomId}`);
            return { status: 'success', joined: true };
        } catch (error: any) {
            console.error(`[TournamentGateway] Join failed: ${error.message}`);
            throw error;
        }
    }
}