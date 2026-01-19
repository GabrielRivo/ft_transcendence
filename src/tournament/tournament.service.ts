import { Server } from 'socket.io';
import { Service, Inject, InjectPlugin, OnModuleInit } from 'my-fastify-decorators';
import { TournamentRepository } from './tournament.repository.js';
import { ParticipantService, GuestInfo } from '../participant/participant.service.js';
import { ParticipantRepository } from '../participant/participant.repository.js';
import { BracketService } from '../bracket/bracket.service.js';
import { CreateTournamentDto } from './dto/create-tournament.dto.js';
import { JoinTournamentDto } from './dto/join-tournament.dto.js';
import { ProcessMatchResultDto } from './dto/process-match-result.dto.js';
import {
	Participant,
	BracketData,
	BracketMatch,
	Tournament,
	TournamentInsertData,
    OperationResult,
    CreateTournamentResult,
    JoinTournamentResult,
    StartTournamentResult,
	LaunchMatchResult,
	ProcessMatchResultData,
	success,
	failure,
} from '../types.js';
import type { JwtPayload } from '../guards/optional-auth.guard.js';
import { v4 as uuidv4 } from 'uuid';
import config from '../config.js';
import { GameService } from '../services/game.service.js';

@Service()
export class TournamentService implements OnModuleInit {
    @Inject(TournamentRepository)
    private tournamentRepository!: TournamentRepository;

    @Inject(ParticipantService)
    private participantService!: ParticipantService;

    @Inject(ParticipantRepository)
    private participantRepository!: ParticipantRepository;

	@Inject(BracketService)
	private bracketService!: BracketService;

	@Inject(GameService)
	private gameService!: GameService;

	@InjectPlugin('io')
	private io?: Server;

    private server: Server | undefined;
	private readyPlayers = new Map<string, Set<string>>();
	private autoStartTimers = new Map<string, NodeJS.Timeout>();

    public setServer(server: Server): void {
        this.server = server;
        console.debug('[Tournament] [setServer] Server instance set successfully', {
            hasServer: !!server,
            hasSockets: !!(server && server.sockets),
        });
    }

	async onModuleInit(): Promise<void> {
		if (this.io) {
			this.setServer(this.io);
		} else {
			console.warn('[Tournament] [init] Socket.IO instance not available to TournamentService');
		}
		// Reprise des tournois actifs au démarrage
		await this.resumeActiveTournaments();
		await this.resumePendingAutoStarts();
	}

    // =========================================================================
    // CREATE - Créer un nouveau tournoi
    // =========================================================================
    create(dto: CreateTournamentDto, creator: Participant): OperationResult<CreateTournamentResult> {
        const id = uuidv4();
        const adminSecret = creator.type === 'guest' ? uuidv4() : null;
		const startDate =
			dto.startMode === 'AUTO_TIMER'
				? new Date(Date.now() + config.tournament.matchAcceptTimeout).toISOString()
				: null;

        const emptyBracket: BracketData = {
            currentRound: 0,
            totalRounds: Math.log2(dto.size),
            matches: [],
        };

        const insertData: TournamentInsertData = {
            id,
            name: dto.name,
            status: 'PENDING',
            size: dto.size,
            current_round: 0,
            start_mode: dto.startMode,
            start_date: startDate,
            bracket_data: JSON.stringify(emptyBracket),
            created_by: creator.userId,
            admin_secret: adminSecret,
            version: 0,
        };

        this.tournamentRepository.create(insertData);
        this.participantRepository.add(creator, id);

        const tournament = this.tournamentRepository.findById(id);
        if (!tournament) {
            return failure('TOURNAMENT_NOT_FOUND', 'Échec de la création du tournoi');
        }

		if (tournament.startMode === 'AUTO_TIMER' && tournament.startDate) {
			this.scheduleAutoStart(tournament.id, new Date(tournament.startDate).getTime());
		}

        return success({
            tournament,
            adminSecret: adminSecret ?? undefined,
        });
    }

    // =========================================================================
    // JOIN - Rejoindre un tournoi existant
    // =========================================================================
    join(
        tournamentId: string,
        user: JwtPayload | null,
        dto: JoinTournamentDto
    ): OperationResult<JoinTournamentResult> {
        const tournament = this.tournamentRepository.findById(tournamentId);
        if (!tournament) {
            return failure('TOURNAMENT_NOT_FOUND', 'Tournoi introuvable');
        }

        if (tournament.status === 'CANCELLED' || tournament.status === 'FINISHED') {
            return failure('TOURNAMENT_CANCELLED', 'Le tournoi est terminé ou annulé');
        }
        if (tournament.status !== 'PENDING') {
            return failure('TOURNAMENT_ALREADY_STARTED', 'Le tournoi a déjà commencé');
        }

        // Vérifier si le tournoi n'est pas plein
        const participants = this.participantRepository.list(tournamentId);
        if (participants.length >= tournament.size) {
            return failure('TOURNAMENT_FULL', 'Le tournoi est complet');
        }

        // Déterminer l'alias final avant création
        const alias = user ? user.username : dto.alias;
        
        // Vérifier alias pour les invités
        if (!user && !alias) {
            return failure('ALIAS_REQUIRED_FOR_GUEST', 'Un alias est requis pour les participants invités');
        }
        if (!user && alias) {
            const validation = this.participantService.validateGuestAlias(alias);
            if (!validation.valid) {
                return failure('ALIAS_INVALID', validation.error ?? 'Alias invalide');
            }
        }

        // Vérifier si l'utilisateur n'a pas déjà rejoint
        if (user) {
            const alreadyJoined = participants.some(p => p.userId === String(user.id));
            if (alreadyJoined) {
                return failure('PARTICIPANT_ALREADY_JOINED', 'Vous avez déjà rejoint ce tournoi');
            }
        }

        // Vérifier unicité de l'alias (guest ou user)
        const aliasConflict = participants.some(
            p => p.alias.toLowerCase() === alias!.toLowerCase()
        );
        if (aliasConflict) {
            return failure('ALIAS_ALREADY_TAKEN', 'Cet alias est déjà utilisé dans ce tournoi');
        }

        // Créer le participant (validation renforcée dans ParticipantService)
        const guestInfo: GuestInfo | undefined = dto.alias ? { alias: dto.alias } : undefined;
        const participant = this.participantService.createParticipant(user, guestInfo);

        this.participantRepository.add(participant, tournamentId);

        // Récupérer le tournoi mis à jour
        const updatedTournament = this.tournamentRepository.findById(tournamentId);
        if (!updatedTournament) {
            return failure('TOURNAMENT_NOT_FOUND', 'Erreur lors de la récupération du tournoi');
        }

		// Émettre l'événement WebSocket
		this.emitToTournament(tournamentId, 'lobby_update', {
			tournamentId,
			participant,
			participantCount: participants.length + 1,
		});

		// Lancer automatiquement si la taille est atteinte et que le mode l'autorise
		const participantCount = participants.length + 1;
		if (
			updatedTournament.status === 'PENDING' &&
			updatedTournament.startMode === 'AUTO_FULL' &&
			participantCount === updatedTournament.size
		) {
			const startResult = this.start(
				tournamentId,
				null,
				updatedTournament.adminSecret ?? undefined,
				{ skipAuth: true },
			);
			if (startResult.success) {
				return success({
					tournament: startResult.data.tournament,
					participant,
				});
			}
		} else if (
			updatedTournament.status === 'PENDING' &&
			updatedTournament.startMode === 'AUTO_TIMER' &&
			updatedTournament.startDate
		) {
			this.scheduleAutoStart(tournamentId, new Date(updatedTournament.startDate).getTime());
		}

        return success({
            tournament: updatedTournament,
            participant,
        });
    }

    // =========================================================================
    // START - Démarrer un tournoi
    // =========================================================================
    start(
        tournamentId: string,
        user: JwtPayload | null,
        adminSecret?: string,
		options?: { skipAuth?: boolean },
    ): OperationResult<StartTournamentResult> {
        const tournament = this.tournamentRepository.findById(tournamentId);
        if (!tournament) {
            return failure('TOURNAMENT_NOT_FOUND', 'Tournoi introuvable');
        }

        if (tournament.status === 'CANCELLED') {
            return failure('TOURNAMENT_CANCELLED', 'Le tournoi est annulé');
        }
        if (tournament.status === 'FINISHED') {
            return failure('TOURNAMENT_ALREADY_STARTED', 'Le tournoi est terminé');
        }
        if (tournament.status !== 'PENDING') {
            return failure('TOURNAMENT_NOT_PENDING', 'Le tournoi ne peut pas être démarré');
        }

        // Vérifier les droits d'administration
		if (!options?.skipAuth) {
			const isAuthorized = this.checkAdminRights(tournament, user, adminSecret);
			if (!isAuthorized) {
				return failure('UNAUTHORIZED', 'Vous n\'êtes pas autorisé à démarrer ce tournoi');
			}
		}

        // Récupérer les participants
        const participants = this.participantRepository.list(tournamentId);
        if (participants.length < config.tournament.minPlayers) {
            return failure(
                'NOT_ENOUGH_PARTICIPANTS',
                `Le tournoi nécessite au moins ${config.tournament.minPlayers} participants (actuellement: ${participants.length})`
            );
        }
        if (participants.length !== tournament.size) {
            return failure(
                'NOT_ENOUGH_PARTICIPANTS',
                `Le tournoi nécessite ${tournament.size} participants (actuellement: ${participants.length})`
            );
        }

        // Générer le bracket
        const bracket = this.bracketService.generateBracket(participants);

        // Mettre à jour le tournoi
        const updated = this.tournamentRepository.updateBracket(
            tournamentId,
            bracket,
            1,
            tournament.version
        );

        if (!updated) {
            return failure('OPTIMISTIC_LOCK_ERROR', 'Conflit de version, veuillez réessayer');
        }

        const statusUpdated = this.tournamentRepository.updateStatus(
            tournamentId,
            'IN_PROGRESS',
            tournament.version + 1
        );

        if (!statusUpdated) {
            return failure('OPTIMISTIC_LOCK_ERROR', 'Conflit de version, veuillez réessayer');
        }

        const updatedTournament = this.tournamentRepository.findById(tournamentId);
        if (!updatedTournament) {
            return failure('TOURNAMENT_NOT_FOUND', 'Erreur lors de la récupération du tournoi');
        }

		this.clearAutoStartTimer(tournamentId);

		// Émettre l'événement WebSocket
		this.emitToTournament(tournamentId, 'tournament_started', {
			tournamentId,
			bracket: updatedTournament.bracketData,
		});
		this.emitToTournament(tournamentId, 'bracket_update', {
			tournamentId,
			bracket: updatedTournament.bracketData,
		});

        return success({ tournament: updatedTournament });
    }

    // =========================================================================
    // LAUNCH MATCH - Lancer un match spécifique
    // =========================================================================
    async launchMatch(
        tournamentId: string,
        matchId: number,
        user: JwtPayload | null,
        adminSecret?: string,
		options?: { skipAuth?: boolean },
    ): Promise<OperationResult<LaunchMatchResult>> {
        const tournament = this.tournamentRepository.findById(tournamentId);
        if (!tournament) {
            return failure('TOURNAMENT_NOT_FOUND', 'Tournoi introuvable');
        }

        if (tournament.status === 'CANCELLED') {
            return failure('TOURNAMENT_CANCELLED', 'Le tournoi est annulé');
        }
        if (tournament.status === 'FINISHED') {
            return failure('TOURNAMENT_ALREADY_STARTED', 'Le tournoi est terminé');
        }
        if (tournament.status !== 'IN_PROGRESS') {
            return failure('TOURNAMENT_NOT_IN_PROGRESS', 'Le tournoi n\'est pas en cours');
        }

        // Vérifier les droits d'administration
		if (!options?.skipAuth) {
			const isAuthorized = this.checkAdminRights(tournament, user, adminSecret);
			if (!isAuthorized) {
				return failure('UNAUTHORIZED', 'Vous n\'êtes pas autorisé à lancer ce match');
			}
		}

        const match = this.bracketService.getMatchById(tournament.bracketData, matchId);
        if (!match) {
            return failure('MATCH_NOT_FOUND', 'Match introuvable');
        }

        if (!this.bracketService.isMatchReady(match)) {
            return failure('MATCH_NOT_READY', 'Le match n\'est pas prêt (joueurs manquants)');
        }

        if (match.status !== 'PENDING') {
            return failure('MATCH_ALREADY_STARTED', 'Le match a déjà été lancé');
        }

        // Créer le game via Game Service
        const gameId = await this.gameService.createGame({
            player1Id: match.player1Id!,
            player2Id: match.player2Id!,
            tournamentId,
            matchId,
        });
        if (!gameId) {
            return failure('GAME_SERVICE_UNAVAILABLE', 'Création de la partie impossible');
        }

        // Lancer le match dans le bracket
		let updatedBracket: BracketData;
		try {
			updatedBracket = this.bracketService.launchMatch(
				tournament.bracketData,
				matchId,
				gameId
			);
		} catch (err) {
			return this.mapBracketError(err);
		}

        // Sauvegarder
        const updated = this.tournamentRepository.updateBracket(
            tournamentId,
            updatedBracket,
            tournament.currentRound,
            tournament.version
        );

        if (!updated) {
            return failure('OPTIMISTIC_LOCK_ERROR', 'Conflit de version, veuillez réessayer');
        }

        const launchedMatch = this.bracketService.getMatchById(updatedBracket, matchId)!;

		// Émettre l'événement WebSocket
		this.emitToTournament(tournamentId, 'match_ready', {
			tournamentId,
			match: launchedMatch,
			gameId,
		});

        return success({
            match: launchedMatch,
            gameId,
        });
    }

	/**
	 * Enregistre un joueur "prêt" et déclenche le lancement automatique si les deux joueurs confirment.
	 */
	async registerPlayerReady(
		tournamentId: string,
		matchId: number,
		participantId?: string,
	): Promise<OperationResult<{ readyCount: number; match?: BracketMatch; gameId?: string }>> {
		if (!participantId) {
			return failure('UNAUTHORIZED', 'Participant non identifié');
		}
		const tournament = this.tournamentRepository.findById(tournamentId);
		if (!tournament) {
			return failure('TOURNAMENT_NOT_FOUND', 'Tournoi introuvable');
		}
		if (tournament.status !== 'IN_PROGRESS') {
			return failure('TOURNAMENT_NOT_IN_PROGRESS', 'Le tournoi n\'est pas en cours');
		}
		const match = this.bracketService.getMatchById(tournament.bracketData, matchId);
		if (!match) {
			return failure('MATCH_NOT_FOUND', 'Match introuvable');
		}
		if (match.status !== 'PENDING') {
			return failure('MATCH_ALREADY_STARTED', 'Le match a déjà été lancé');
		}
		if (match.player1Id !== participantId && match.player2Id !== participantId) {
			return failure('UNAUTHORIZED', 'Vous ne participez pas à ce match');
		}

		const key = `${tournamentId}:${matchId}`;
		const readySet = this.readyPlayers.get(key) ?? new Set<string>();
		readySet.add(participantId);
		this.readyPlayers.set(key, readySet);

		this.emitToTournament(tournamentId, 'player_ready', {
			tournamentId,
			matchId,
			playerId: participantId,
			readyCount: readySet.size,
		});

		if (readySet.size >= 2) {
			const launchResult = await this.launchMatch(
				tournamentId,
				matchId,
				null,
				tournament.adminSecret ?? undefined,
				{ skipAuth: true },
			);
			if (launchResult.success) {
				this.readyPlayers.delete(key);
				return success({
					match: launchResult.data.match,
					gameId: launchResult.data.gameId,
					readyCount: readySet.size,
				});
			}
			return launchResult;
		}

		return success({ readyCount: readySet.size });
	}

    // =========================================================================
    // PROCESS MATCH RESULT - Traiter le résultat d'un match
    // =========================================================================
	processMatchResult(
		tournamentId: string,
		dto: ProcessMatchResultDto,
		user: JwtPayload | null,
		adminSecret?: string,
	): OperationResult<ProcessMatchResultData> {
		const tournament = this.tournamentRepository.findById(tournamentId);
        if (!tournament) {
            return failure('TOURNAMENT_NOT_FOUND', 'Tournoi introuvable');
        }

        if (tournament.status === 'CANCELLED') {
            return failure('TOURNAMENT_CANCELLED', 'Le tournoi est annulé');
        }
        if (tournament.status === 'FINISHED') {
            return failure('TOURNAMENT_ALREADY_STARTED', 'Le tournoi est terminé');
        }
        if (tournament.status !== 'IN_PROGRESS') {
            return failure('TOURNAMENT_NOT_IN_PROGRESS', 'Le tournoi n\'est pas en cours');
        }

		const isAuthorized = this.checkAdminRights(tournament, user, adminSecret);
		if (!isAuthorized) {
			return failure('UNAUTHORIZED', 'Vous n\'êtes pas autorisé à clôturer ce match');
		}

        const match = this.bracketService.getMatchByGameId(tournament.bracketData, dto.gameId);
        if (!match) {
            return failure('MATCH_NOT_FOUND', 'Match introuvable');
        }

        if (match.status === 'COMPLETED') {
            return failure('MATCH_ALREADY_COMPLETED', 'Le match est déjà terminé');
        }

        // Vérifier que le vainqueur est bien un des joueurs du match
        if (dto.winnerId !== match.player1Id && dto.winnerId !== match.player2Id) {
            return failure('INVALID_WINNER', 'Le vainqueur doit être un des joueurs du match');
        }

        // Avancer le vainqueur dans le bracket
		let updatedBracket: BracketData;
		try {
			updatedBracket = this.bracketService.advanceWinner(
				tournament.bracketData,
				dto.gameId,
				dto.winnerId,
				dto.score
			);
		} catch (err) {
			return this.mapBracketError(err);
		}

        const isRoundComplete = this.bracketService.isRoundComplete(updatedBracket);
        const isTournamentComplete = this.bracketService.isTournamentComplete(updatedBracket);

        // Passer au round suivant si nécessaire
        let nextRound: number | undefined;
        if (isRoundComplete && !isTournamentComplete) {
            updatedBracket = this.bracketService.advanceToNextRound(updatedBracket);
            nextRound = updatedBracket.currentRound;
        }

        // Sauvegarder
        const updated = this.tournamentRepository.updateBracket(
            tournamentId,
            updatedBracket,
            updatedBracket.currentRound,
            tournament.version
        );

        if (!updated) {
            return failure('OPTIMISTIC_LOCK_ERROR', 'Conflit de version, veuillez réessayer');
        }

		// Si le tournoi est terminé, mettre à jour le statut et les rangs
		let winner: Participant | undefined;
		let runnerUp: Participant | undefined;
		if (isTournamentComplete) {
			this.tournamentRepository.updateStatus(
				tournamentId,
				'FINISHED',
				tournament.version + 1
			);

			const winnerId = this.bracketService.getFinalWinnerId(updatedBracket);
			const finalMatch = updatedBracket.matches.find(
				(m) => m.round === updatedBracket.totalRounds && m.status === 'COMPLETED',
			);
			const runnerUpId =
				finalMatch && finalMatch.player1Id && finalMatch.player2Id
					? finalMatch.player1Id === winnerId
						? finalMatch.player2Id
						: finalMatch.player1Id
					: null;

			if (winnerId) {
				this.participantRepository.updateRank(winnerId, tournamentId, 1);
				winner = this.participantRepository.findById(winnerId, tournamentId) ?? undefined;
			}
			if (runnerUpId) {
				this.participantRepository.updateRank(runnerUpId, tournamentId, 2);
				runnerUp = this.participantRepository.findById(runnerUpId, tournamentId) ?? undefined;
			}
		}

        const updatedTournament = this.tournamentRepository.findById(tournamentId);
        if (!updatedTournament) {
            return failure('TOURNAMENT_NOT_FOUND', 'Erreur lors de la récupération du tournoi');
        }

        const completedMatch = this.bracketService.getMatchByGameId(updatedBracket, dto.gameId)!;

        // Émettre les événements WebSocket
        this.emitToTournament(tournamentId, 'match_completed', {
            tournamentId,
            match: completedMatch,
            winnerId: dto.winnerId,
            score: dto.score,
        });
        this.emitToTournament(tournamentId, 'bracket_update', {
            tournamentId,
            bracket: updatedTournament.bracketData,
        });

        if (isRoundComplete && nextRound) {
            this.emitToTournament(tournamentId, 'round_completed', {
                tournamentId,
                completedRound: nextRound - 1,
                nextRound,
            });
        }

		if (isTournamentComplete) {
			this.emitToTournament(tournamentId, 'tournament_completed', {
				tournamentId,
				winner,
				runnerUp,
			});
		}

		return success({
			tournament: updatedTournament,
            match: completedMatch,
			isRoundComplete,
			isTournamentComplete,
			nextRound,
			winner,
		});
	}

	// =========================================================================
	// DISQUALIFY / FORFEIT - Abandon ou disqualification en cours de tournoi
	// =========================================================================
	disqualifyParticipant(
		tournamentId: string,
		participantId: string,
		user: JwtPayload | null,
		adminSecret?: string,
	): OperationResult<ProcessMatchResultData> {
		const tournament = this.tournamentRepository.findById(tournamentId);
		if (!tournament) {
			return failure('TOURNAMENT_NOT_FOUND', 'Tournoi introuvable');
		}
		if (tournament.status === 'CANCELLED') {
			return failure('TOURNAMENT_CANCELLED', 'Le tournoi est annulé');
		}
		if (tournament.status !== 'IN_PROGRESS') {
			return failure('TOURNAMENT_NOT_IN_PROGRESS', 'Le tournoi n\'est pas en cours');
		}

		const isAuthorized = this.checkAdminRights(tournament, user, adminSecret);
		if (!isAuthorized) {
			return failure('UNAUTHORIZED', 'Vous n\'êtes pas autorisé à disqualifier un participant');
		}

		const participant = this.participantRepository.findById(participantId, tournamentId);
		if (!participant) {
			return failure('PARTICIPANT_NOT_FOUND', 'Participant introuvable');
		}

		// Chercher un match actif du participant
		const activeMatch = tournament.bracketData.matches.find(
			(m) =>
				(m.player1Id === participantId || m.player2Id === participantId) &&
				(m.status === 'PENDING' || m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS'),
		);
		if (!activeMatch) {
			return failure('MATCH_NOT_FOUND', 'Aucun match en cours pour ce participant');
		}

		let updatedBracket: BracketData;
		try {
			updatedBracket = this.bracketService.forfeitMatch(
				tournament.bracketData,
				activeMatch.id,
				participantId,
			);
		} catch (err) {
			return this.mapBracketError(err);
		}

		const isRoundComplete = this.bracketService.isRoundComplete(updatedBracket);
		const isTournamentComplete = this.bracketService.isTournamentComplete(updatedBracket);
		let nextRound: number | undefined;
		if (isRoundComplete && !isTournamentComplete) {
			this.bracketService.advanceToNextRound(updatedBracket);
			nextRound = updatedBracket.currentRound;
		}

		const updated = this.tournamentRepository.updateBracket(
			tournamentId,
			updatedBracket,
			updatedBracket.currentRound,
			tournament.version,
		);
		if (!updated) {
			return failure('OPTIMISTIC_LOCK_ERROR', 'Conflit de version, veuillez réessayer');
		}

		let winner: Participant | undefined;
		let runnerUp: Participant | undefined;
		if (isTournamentComplete) {
			this.tournamentRepository.updateStatus(
				tournamentId,
				'FINISHED',
				tournament.version + 1,
			);
			const finalMatch = updatedBracket.matches.find(
				(m) => m.round === updatedBracket.totalRounds && m.status === 'COMPLETED',
			);
			const winnerId = finalMatch?.winnerId ?? null;
			const runnerUpId =
				finalMatch && finalMatch.player1Id && finalMatch.player2Id
					? finalMatch.player1Id === winnerId
						? finalMatch.player2Id
						: finalMatch.player1Id
					: null;
			if (winnerId) {
				this.participantRepository.updateRank(winnerId, tournamentId, 1);
				winner = this.participantRepository.findById(winnerId, tournamentId) ?? undefined;
			}
			if (runnerUpId) {
				this.participantRepository.updateRank(runnerUpId, tournamentId, 2);
				runnerUp = this.participantRepository.findById(runnerUpId, tournamentId) ?? undefined;
			}
		} else {
			// Marquer le disqualifié comme éliminé (rang non déterminé -> utiliser taille max)
			const eliminationRank = tournament.size;
			this.participantRepository.updateRank(participantId, tournamentId, eliminationRank);
		}

		const updatedTournament = this.tournamentRepository.findById(tournamentId);
		if (!updatedTournament) {
			return failure('TOURNAMENT_NOT_FOUND', 'Erreur lors de la récupération du tournoi');
		}

			this.emitToTournament(tournamentId, 'match_completed', {
				tournamentId,
				match: this.bracketService.getMatchById(updatedBracket, activeMatch.id),
				winnerId: this.bracketService.getMatchById(updatedBracket, activeMatch.id)?.winnerId,
				forfeit: true,
			});

			if (isRoundComplete && nextRound) {
				this.emitToTournament(tournamentId, 'round_completed', {
					tournamentId,
					completedRound: nextRound - 1,
					nextRound,
				});
			}

			if (isTournamentComplete) {
				this.emitToTournament(tournamentId, 'tournament_completed', {
					tournamentId,
					winner,
					runnerUp,
				});
			}
			this.emitToTournament(tournamentId, 'bracket_update', {
				tournamentId,
				bracket: updatedTournament.bracketData,
			});

		return success({
			tournament: updatedTournament,
			match: this.bracketService.getMatchById(updatedBracket, activeMatch.id)!,
			isRoundComplete,
			isTournamentComplete,
			nextRound,
			winner,
		});
	}

	// =========================================================================
	// HELPERS
	// =========================================================================

	private mapBracketError(err: unknown): OperationResult<never> {
		const message = err instanceof Error ? err.message : 'Mise à jour du bracket impossible';
		const normalized = message.toLowerCase();
		if (normalized.includes('not found')) {
			return failure('MATCH_NOT_FOUND', message);
		}
		if (normalized.includes('already completed')) {
			return failure('MATCH_ALREADY_COMPLETED', message);
		}
		if (normalized.includes('not ready')) {
			return failure('MATCH_NOT_READY', message);
		}
		return failure('OPTIMISTIC_LOCK_ERROR', message);
	}

	/**
	 * Vérifie si l'utilisateur a les droits d'administration sur le tournoi
	 */
	private checkAdminRights(
		tournament: Tournament,
        user: JwtPayload | null,
        adminSecret?: string
    ): boolean {
        // Si le tournoi a été créé par un utilisateur connecté
        if (tournament.createdBy) {
            return user !== null && String(user.id) === tournament.createdBy;
        }
        // Si le tournoi a été créé par un invité (admin_secret requis)
        if (tournament.adminSecret) {
            return adminSecret === tournament.adminSecret;
        }
        return false;
    }

    /**
     * Émet un événement WebSocket à tous les clients du tournoi
     */
	private emitToTournament(tournamentId: string, event: string, data: unknown): void {
		if (this.server) {
			this.server.to(`tournament:${tournamentId}`).emit(event, data);
		}
	}

	private scheduleAutoStart(tournamentId: string, startTimeMs: number): void {
		const delay = Math.max(0, startTimeMs - Date.now());
		this.clearAutoStartTimer(tournamentId);
		const timer = setTimeout(() => {
			const result = this.start(tournamentId, null, undefined, { skipAuth: true });
			if (!result.success) {
				console.warn('[Tournament] [auto-start] Failed to auto-start tournament', {
					tournamentId,
					error: result.error,
				});
			}
		}, delay);
		this.autoStartTimers.set(tournamentId, timer);
	}

	private clearAutoStartTimer(tournamentId: string): void {
		const timer = this.autoStartTimers.get(tournamentId);
		if (timer) {
			clearTimeout(timer);
			this.autoStartTimers.delete(tournamentId);
		}
	}

	private async resumePendingAutoStarts(): Promise<void> {
		const pending = this.tournamentRepository.listByStatus('PENDING');
		for (const tournament of pending) {
			if (tournament.startMode === 'AUTO_TIMER' && tournament.startDate) {
				this.scheduleAutoStart(tournament.id, new Date(tournament.startDate).getTime());
			}
		}
	}

	/**
	 * Reprise au boot : scanne les tournois en cours et réconcilie les matchs actifs
	 */
	private async resumeActiveTournaments(): Promise<void> {
		const activeTournaments = this.tournamentRepository.listByStatus('IN_PROGRESS');
		for (const tournament of activeTournaments) {
			try {
				let bracket = tournament.bracketData;
				let version = tournament.version;
				let changed = false;

				for (const match of bracket.matches) {
					try {
						if (!match.gameId) continue;
						if (match.status === 'COMPLETED') continue;
						const gameInfo = await this.gameService.getGame(match.gameId);
						if (!gameInfo || gameInfo.status !== 'FINISHED' || !gameInfo.winnerId) continue;

						const score = (gameInfo.score as [number, number] | undefined) ?? [0, 0];
						bracket = this.bracketService.advanceWinner(
							bracket,
							match.gameId,
							gameInfo.winnerId,
							score,
						);
						// Si le round est complet, on avance
						if (this.bracketService.isRoundComplete(bracket) && !this.bracketService.isTournamentComplete(bracket)) {
							bracket = this.bracketService.advanceToNextRound(bracket);
						}
						changed = true;
					} catch (err) {
						console.warn('[Tournament] [resume] Failed to reconcile match', {
							tournamentId: tournament.id,
							matchId: match.id,
							err,
						});
					}
				}

					if (changed) {
						let winnerId: string | null = null;
						let runnerUpId: string | null = null;

						const updated = this.tournamentRepository.updateBracket(
							tournament.id,
							bracket,
							bracket.currentRound,
							version,
						);
					if (!updated) {
						console.warn('[Tournament] [resume] Optimistic lock error while resuming', {
							tournamentId: tournament.id,
						});
						continue;
					}

						if (this.bracketService.isTournamentComplete(bracket)) {
							this.tournamentRepository.updateStatus(tournament.id, 'FINISHED', version + 1);
							winnerId = this.bracketService.getFinalWinnerId(bracket);
							const finalMatch = bracket.matches.find(
								(m) => m.round === bracket.totalRounds && m.status === 'COMPLETED',
							);
							runnerUpId =
								finalMatch && finalMatch.player1Id && finalMatch.player2Id
									? finalMatch.player1Id === winnerId
										? finalMatch.player2Id
										: finalMatch.player1Id
									: null;
							if (winnerId) {
								this.participantRepository.updateRank(winnerId, tournament.id, 1);
							}
							if (runnerUpId) {
								this.participantRepository.updateRank(runnerUpId, tournament.id, 2);
							}
						}

						this.emitToTournament(tournament.id, 'bracket_update', {
							tournamentId: tournament.id,
							bracket,
						});
						if (this.bracketService.isTournamentComplete(bracket)) {
							this.emitToTournament(tournament.id, 'tournament_completed', {
								tournamentId: tournament.id,
								winner: winnerId
									? this.participantRepository.findById(winnerId, tournament.id)
									: undefined,
								runnerUp: typeof runnerUpId === 'string'
									? this.participantRepository.findById(runnerUpId, tournament.id)
									: undefined,
							});
						}
					}
			} catch (err) {
				console.error('[Tournament] [resume] Failed to resume tournament', {
					tournamentId: tournament.id,
					err,
				});
			}
		}
	}
}
