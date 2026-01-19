import {
	Body,
	BodySchema,
	Controller,
	Get,
	Inject,
	Param,
	Post,
	Query,
	Res,
	UseGuards,
	JWTBody,
	QuerySchema,
} from 'my-fastify-decorators';
import type { FastifyReply } from 'fastify';
import { OptionalAuthGuard, type JwtPayload } from '../guards/optional-auth.guard.js';
import { TournamentService } from './tournament.service.js';
import { TournamentRepository } from './tournament.repository.js';
import { HistoryService } from '../history/history.service.js';
import {
	CreateTournamentDto,
	CreateTournamentSchema,
	JoinTournamentDto,
	JoinTournamentSchema,
	StartTournamentDto,
	StartTournamentSchema,
	ProcessMatchResultDto,
	ProcessMatchResultSchema,
	LaunchMatchDto,
	LaunchMatchSchema,
	DisqualifyParticipantDto,
	DisqualifyParticipantSchema,
	ListTournamentsQueryDto,
	ListTournamentsQuerySchema,
} from './dto/index.js';
import { ParticipantService } from '../participant/participant.service.js';
import type { OperationResult } from '../types.js';

@UseGuards(OptionalAuthGuard)
@Controller('/api/tournaments')
export class TournamentController {
	@Inject(TournamentService)
	private tournamentService!: TournamentService;

	@Inject(TournamentRepository)
	private tournamentRepository!: TournamentRepository;

	@Inject(HistoryService)
	private historyService!: HistoryService;

	@Inject(ParticipantService)
	private participantService!: ParticipantService;

	@Post('/')
	@BodySchema(CreateTournamentSchema)
	async createTournament(
		@Body() dto: CreateTournamentDto,
		@JWTBody() user: JwtPayload | null,
		@Res() res: FastifyReply,
	) {
		if (!user && !(dto as any).alias) {
			res.status(400);
			return { success: false, error: { code: 'ALIAS_REQUIRED_FOR_GUEST', message: 'Alias requis pour créer un tournoi en invité' } };
		}
		// Créateur : user authentifié ou invité (alias obligatoire sinon erreur du service)
		const creator = this.participantService.createParticipant(user, {
			alias: (dto as any).alias, // champ optionnel non validé pour guests
		});

		const result = this.tournamentService.create(dto, creator);
		return this.handleResult(res, result, 201);
	}

	@Get('/')
	@QuerySchema(ListTournamentsQuerySchema)
	async listTournaments(@Query() query: ListTournamentsQueryDto) {
		const normalizedStatus = query.status ?? 'PENDING';
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;
		const search = query.search?.toLowerCase();

		const tournaments = this.tournamentRepository.listByStatus(normalizedStatus);
		const filtered = tournaments.filter((t) =>
			search ? t.name.toLowerCase().includes(search) : true,
		);
		const start = (page - 1) * limit;
		const paged = filtered.slice(start, start + limit);
		const safeTournaments = paged.map(({ adminSecret, ...rest }) => rest);

		return {
			data: safeTournaments,
			meta: {
				total: filtered.length,
				page,
				limit,
			},
		};
	}

	@Get('/:id')
	async getTournament(@Param('id') id: string, @Res() res: FastifyReply) {
		const tournament = this.tournamentRepository.findById(id);
		if (!tournament) {
			res.status(404);
			return { success: false, error: { code: 'TOURNAMENT_NOT_FOUND', message: 'Tournoi introuvable' } };
		}
		const { adminSecret, ...safeTournament } = tournament;
		return { success: true, data: safeTournament };
	}

	@Post('/:id/join')
	@BodySchema(JoinTournamentSchema)
	async joinTournament(
		@Param('id') id: string,
		@Body() dto: JoinTournamentDto,
		@JWTBody() user: JwtPayload | null,
		@Res() res: FastifyReply,
	) {
		const result = this.tournamentService.join(id, user, dto);
		if (result.success) {
			// Masquer l'adminSecret si présent
			const { adminSecret, ...tournament } = result.data.tournament;
			return this.handleResult(res, {
				success: true,
				data: { ...result.data, tournament },
			}, 200);
		}
		return this.handleResult(res, result, 200);
	}

	@Post('/:id/start')
	@BodySchema(StartTournamentSchema)
	async startTournament(
		@Param('id') id: string,
		@Body() dto: StartTournamentDto,
		@JWTBody() user: JwtPayload | null,
		@Res() res: FastifyReply,
	) {
		const result = this.tournamentService.start(id, user, dto.adminSecret);
		if (result.success) {
			const { adminSecret, ...tournament } = result.data.tournament;
			return this.handleResult(
				res,
				{
					success: true,
					data: { ...result.data, tournament },
				},
				200,
			);
		}
		return this.handleResult(res, result, 200);
	}

	@Post('/:id/matches/:matchId/launch')
	@BodySchema(LaunchMatchSchema)
	async launchMatch(
		@Param('id') id: string,
		@Param('matchId') matchId: string,
		@Body() dto: LaunchMatchDto,
		@JWTBody() user: JwtPayload | null,
		@Res() res: FastifyReply,
	) {
		const resolvedMatchId = dto.matchId ?? Number(matchId);
		if (Number.isNaN(resolvedMatchId)) {
			res.status(400);
			return { success: false, error: { code: 'MATCH_NOT_FOUND', message: 'matchId invalide' } };
		}
		const result = await this.tournamentService.launchMatch(
			id,
			resolvedMatchId,
			user,
			dto.adminSecret,
		);
		return this.handleResult(res, result, 200);
	}

	@Post('/:id/matches/result')
	@BodySchema(ProcessMatchResultSchema)
	async processResult(
		@Param('id') id: string,
		@Body() dto: ProcessMatchResultDto,
		@JWTBody() user: JwtPayload | null,
		@Res() res: FastifyReply,
	) {
		const result = this.tournamentService.processMatchResult(id, dto, user, dto.adminSecret);
		if (result.success) {
			const { adminSecret, ...tournament } = result.data.tournament;
			return this.handleResult(
				res,
				{
					success: true,
					data: { ...result.data, tournament },
				},
				200,
			);
		}
		return this.handleResult(res, result, 200);
	}

	@Get('/user/:userId/history')
	async getUserHistory(@Param('userId') userId: string) {
		const history = this.historyService.listUserHistory(userId);
		return { data: history };
	}

	@Post('/:id/participants/:participantId/disqualify')
	@BodySchema(DisqualifyParticipantSchema)
	async disqualifyParticipant(
		@Param('id') id: string,
		@Param('participantId') participantId: string,
		@Body() dto: DisqualifyParticipantDto,
		@JWTBody() user: JwtPayload | null,
		@Res() res: FastifyReply,
	) {
		const result = this.tournamentService.disqualifyParticipant(
			id,
			participantId,
			user,
			dto.adminSecret,
		);
		if (result.success) {
			const { adminSecret, ...tournament } = result.data.tournament;
			return this.handleResult(
				res,
				{
					success: true,
					data: { ...result.data, tournament },
				},
				200,
			);
		}
		return this.handleResult(res, result, 200);
	}

	private handleResult<T>(
		res: FastifyReply,
		result: OperationResult<T>,
		successStatus = 200,
	): OperationResult<T> | Promise<OperationResult<T>> {
		if (result.success) {
			res.status(successStatus);
			return result;
		}
		const status = this.mapErrorToStatus(result.error.code);
		res.status(status);
		return result;
	}

	private mapErrorToStatus(code: string): number {
		switch (code) {
			case 'TOURNAMENT_NOT_FOUND':
			case 'PARTICIPANT_NOT_FOUND':
			case 'MATCH_NOT_FOUND':
			 return 404;
			case 'UNAUTHORIZED':
				return 403;
			case 'TOURNAMENT_FULL':
			case 'TOURNAMENT_ALREADY_STARTED':
			case 'TOURNAMENT_NOT_PENDING':
			case 'TOURNAMENT_NOT_IN_PROGRESS':
			case 'TOURNAMENT_CANCELLED':
			case 'MATCH_ALREADY_STARTED':
			case 'MATCH_ALREADY_COMPLETED':
			case 'MATCH_NOT_READY':
			case 'OPTIMISTIC_LOCK_ERROR':
			case 'ALIAS_ALREADY_TAKEN':
			case 'PARTICIPANT_ALREADY_JOINED':
				return 409;
			default:
				return 400;
		}
	}
}
