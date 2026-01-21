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
        const isGuest = !user;
        const userId = isGuest ? socket.id : user.id;

        const command = new JoinTournamentDto();
        command.displayName = payload.displayName;
        await this.joinUseCase.execute(payload.tournamentId, command, userId, isGuest);
        const roomId = `tournament:${payload.tournamentId}`;
        await socket.join(roomId);
        return { status: 'success', joined: true };
    }
}