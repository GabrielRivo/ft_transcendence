import { IsRequired, IsString, MaxLength, MinLength, generateSchema } from 'my-class-validator';
import {
    ConnectedSocket,
    Inject,
    JWTBody,
    MessageBody,
    SocketSchema,
    SubscribeMessage,
    WebSocketGateway,
    SubscribeConnection,
} from 'my-fastify-decorators';
import { Socket } from 'socket.io';
import { JoinTournamentDto } from '../../application/dtos/join-tournament.dto.js';
import { JoinTournamentUseCase } from '../../application/use-cases/join-tournament.use-case.js';
import { LiveScoreService } from '../services/live-score.service.js';

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

export class ListenTournamentPayload {
    @IsString()
    @IsRequired()
    tournamentId!: string;

    @IsString()
    displayName?: string;
}

@WebSocketGateway()
export class TournamentGateway {
    @Inject(JoinTournamentUseCase)
    private joinUseCase!: JoinTournamentUseCase;

    @Inject(LiveScoreService)
    private liveScoreService!: LiveScoreService;

    @SubscribeConnection()
    public handleConnection(@ConnectedSocket() _socket: Socket) { }


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

        try {
            await this.joinUseCase.execute(payload.tournamentId, command, userId, isGuest);
            const roomId = `tournament:${payload.tournamentId}`;
            await socket.join(roomId);
            return { status: 'success', joined: true };
        } catch (error: any) {
            throw error;
        }
    }

    @SubscribeMessage('listen_lobby')
    public async handleListenLobby(@ConnectedSocket() socket: Socket) {
        await socket.join('lobby');
        return { status: 'success' };
    }

    @SubscribeMessage('listen_tournament')
    @SocketSchema(generateSchema(ListenTournamentPayload))
    public async handleListenTournament(
        @ConnectedSocket() socket: Socket,
        @MessageBody() payload: ListenTournamentPayload
    ) {
        const roomId = `tournament:${payload.tournamentId}`;
        await socket.join(roomId);

        const scores = this.liveScoreService.getScores(payload.tournamentId);
        for (const [matchId, score] of scores) {
            socket.emit('match_score_updated', {
                aggregateId: payload.tournamentId,
                payload: {
                    matchId,
                    scoreA: score.scoreA,
                    scoreB: score.scoreB
                },
                occurredAt: new Date().toISOString()
            });
        }

        return { status: 'success' };
    }

    @SubscribeMessage('leave_tournament')
    @SocketSchema(generateSchema(ListenTournamentPayload))
    public async handleLeaveTournament(
        @ConnectedSocket() socket: Socket,
        @MessageBody() payload: ListenTournamentPayload
    ) {
        const roomId = `tournament:${payload.tournamentId}`;
        await socket.leave(roomId);
        return { status: 'success' };
    }
}
