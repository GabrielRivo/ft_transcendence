import {
	ConnectedSocket,
	Inject,
	InjectPlugin,
	JWTBody,
	MessageBody,
	SubscribeConnection,
	SubscribeDisconnection,
	SubscribeMessage,
	WebSocketGateway,
} from 'my-fastify-decorators';
import { Server, Socket } from 'socket.io';
import { TournamentService } from './tournament.service.js';
import { ParticipantService, type GuestInfo } from '../participant/participant.service.js';
import type { JwtPayload } from '../guards/optional-auth.guard.js';
import { TournamentRepository } from './tournament.repository.js';

interface JoinRoomPayload {
	tournamentId: string;
}

interface LeaveRoomPayload {
	tournamentId: string;
}

interface PlayerReadyPayload {
	tournamentId: string;
	matchId: number;
}

interface MatchReadyPayload {
	tournamentId: string;
	matchId: number;
	gameId: string;
	opponentAlias?: string;
	expiresIn?: number;
	targetPlayerId?: string;
}

interface MatchCompletedPayload {
	tournamentId: string;
	matchId: number;
	winnerId: string;
	score: [number, number];
}

interface AuthenticatedSocket extends Socket {
	data: {
		participantId?: string;
	};
}

@WebSocketGateway('/tournament')
export class TournamentGateway {
	@Inject(TournamentService)
	private tournamentService!: TournamentService;

	@Inject(ParticipantService)
	private participantService!: ParticipantService;

	@Inject(TournamentRepository)
	private tournamentRepository!: TournamentRepository;

	@InjectPlugin('io')
	private io!: Server;

	afterInit(server: Server): void {
		this.tournamentService.setServer(server);
		this.wireServiceEvents(server);
	}

	@SubscribeConnection()
	handleConnection(
		@ConnectedSocket() socket: AuthenticatedSocket,
		@JWTBody() user: JwtPayload | null,
	): void {
		const alias = (socket.handshake.auth as any)?.alias as string | undefined;
		const guestId = (socket.handshake.auth as any)?.guestId as string | undefined;

		try {
			const guestInfo: GuestInfo | undefined = alias
				? guestId
					? { alias, sessionId: guestId }
					: { alias }
				: undefined;
			const participant = this.participantService.createParticipant(user, guestInfo);
			socket.data.participantId = participant.id;
			socket.emit('connected', { participantId: participant.id });
		} catch (err: any) {
			socket.emit('error', { message: err?.message || 'Invalid handshake' });
			socket.disconnect();
		}
	}

	@SubscribeDisconnection()
	handleDisconnect(@ConnectedSocket() socket: Socket): void {
		socket.removeAllListeners();
	}

	private getRoomName(tournamentId: string): string {
		return `tournament:${tournamentId}`;
	}

	@SubscribeMessage('join_room')
	async handleJoinRoom(
		@ConnectedSocket() socket: Socket,
		@MessageBody() payload: JoinRoomPayload,
	): Promise<void> {
		const { tournamentId } = payload || {};
		if (!tournamentId) {
			socket.emit('error', { message: 'tournamentId is required' });
			return;
		}
		const exists = this.tournamentRepository.findById(tournamentId);
		if (!exists) {
			socket.emit('error', { message: 'Tournoi introuvable' });
			return;
		}

		const room = this.getRoomName(tournamentId);
		if ((socket as any).rooms?.has?.(room)) {
			socket.emit('joined', { tournamentId });
			return;
		}

		await socket.join(room);
		socket.emit('joined', { tournamentId });
	}

	@SubscribeMessage('leave_room')
	async handleLeaveRoom(
		@ConnectedSocket() socket: Socket,
		@MessageBody() payload: LeaveRoomPayload,
	): Promise<void> {
		const { tournamentId } = payload || {};
		if (!tournamentId) {
			socket.emit('error', { message: 'tournamentId is required' });
			return;
		}
		await socket.leave(this.getRoomName(tournamentId));
		socket.emit('left', { tournamentId });
	}

	@SubscribeMessage('player_ready')
	async handlePlayerReady(
		@ConnectedSocket() socket: Socket,
		@MessageBody() payload: PlayerReadyPayload,
	): Promise<void> {
		if (!payload?.tournamentId || payload.matchId === undefined || payload.matchId === null) {
			socket.emit('error', { message: 'tournamentId and matchId are required' });
			return;
		}

		const result = await this.tournamentService.registerPlayerReady(
			payload.tournamentId,
			payload.matchId,
			(socket as any).data?.participantId,
		);
		if (!result.success) {
			socket.emit('error', { code: result.error.code, message: result.error.message });
			return;
		}
		socket.emit('ready_ack', {
			matchId: payload.matchId,
			readyCount: result.data.readyCount,
			gameId: result.data.gameId,
		});
	}

	@SubscribeMessage('heartbeat')
	handleHeartbeat(@ConnectedSocket() socket: Socket): void {
		socket.emit('heartbeat_ack', { ts: Date.now() });
	}

	private wireServiceEvents(server: Server): void {
		// Les events suivants sont relayés vers les rooms Socket.IO
		this.tournamentService['emitToTournament'] = (tournamentId: string, event: string, data: any) => {
			server.to(this.getRoomName(tournamentId)).emit(event, data);
		};
	}
}
