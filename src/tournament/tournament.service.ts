import { Server } from 'socket.io';
import { Service, Inject } from 'my-fastify-decorators';
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

@Service()
export class TournamentService {
    @Inject(TournamentRepository)
    private tournamentRepository!: TournamentRepository;

    @Inject(ParticipantService)
    private participantService!: ParticipantService;

    @Inject(ParticipantRepository)
    private participantRepository!: ParticipantRepository;

    @Inject(BracketService)
    private bracketService!: BracketService;

    private server: Server | undefined;

    public setServer(server: Server): void {
        this.server = server;
        console.debug('[Tournament] [setServer] Server instance set successfully', {
            hasServer: !!server,
            hasSockets: !!(server && server.sockets),
        });
    }

    // =========================================================================
    // CREATE - Créer un nouveau tournoi
    // =========================================================================
    create(dto: CreateTournamentDto, creator: Participant): OperationResult<CreateTournamentResult> {
        const id = uuidv4();
        const adminSecret = creator.type === 'guest' ? uuidv4() : null;

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
            start_date: null,
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

        // Créer le participant
        const guestInfo: GuestInfo | undefined = dto.alias ? { alias: dto.alias } : undefined;
        const participant = this.participantService.createParticipant(user, guestInfo);

        this.participantRepository.add(participant, tournamentId);

        // Récupérer le tournoi mis à jour
        const updatedTournament = this.tournamentRepository.findById(tournamentId);
        if (!updatedTournament) {
            return failure('TOURNAMENT_NOT_FOUND', 'Erreur lors de la récupération du tournoi');
        }

        // Émettre l'événement WebSocket
        this.emitToTournament(tournamentId, 'participant:joined', {
            tournamentId,
            participant,
            participantCount: participants.length + 1,
        });

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
        adminSecret?: string
    ): OperationResult<StartTournamentResult> {
        const tournament = this.tournamentRepository.findById(tournamentId);
        if (!tournament) {
            return failure('TOURNAMENT_NOT_FOUND', 'Tournoi introuvable');
        }

        if (tournament.status !== 'PENDING') {
            return failure('TOURNAMENT_NOT_PENDING', 'Le tournoi ne peut pas être démarré');
        }

        // Vérifier les droits d'administration
        const isAuthorized = this.checkAdminRights(tournament, user, adminSecret);
        if (!isAuthorized) {
            return failure('UNAUTHORIZED', 'Vous n\'êtes pas autorisé à démarrer ce tournoi');
        }

        // Récupérer les participants
        const participants = this.participantRepository.list(tournamentId);
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

        // Émettre l'événement WebSocket
        this.emitToTournament(tournamentId, 'tournament:started', {
            tournamentId,
            bracket: updatedTournament.bracketData,
        });

        return success({ tournament: updatedTournament });
    }

    // =========================================================================
    // LAUNCH MATCH - Lancer un match spécifique
    // =========================================================================
    launchMatch(
        tournamentId: string,
        matchId: number,
        user: JwtPayload | null,
        adminSecret?: string
    ): OperationResult<LaunchMatchResult> {
        const tournament = this.tournamentRepository.findById(tournamentId);
        if (!tournament) {
            return failure('TOURNAMENT_NOT_FOUND', 'Tournoi introuvable');
        }

        if (tournament.status !== 'IN_PROGRESS') {
            return failure('TOURNAMENT_NOT_IN_PROGRESS', 'Le tournoi n\'est pas en cours');
        }

        // Vérifier les droits d'administration
        const isAuthorized = this.checkAdminRights(tournament, user, adminSecret);
        if (!isAuthorized) {
            return failure('UNAUTHORIZED', 'Vous n\'êtes pas autorisé à lancer ce match');
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

        // Générer un gameId unique
        const gameId = uuidv4();

        // Lancer le match dans le bracket
        const updatedBracket = this.bracketService.launchMatch(
            tournament.bracketData,
            matchId,
            gameId
        );

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
        this.emitToTournament(tournamentId, 'match:launched', {
            tournamentId,
            match: launchedMatch,
            gameId,
        });

        return success({
            match: launchedMatch,
            gameId,
        });
    }

    // =========================================================================
    // PROCESS MATCH RESULT - Traiter le résultat d'un match
    // =========================================================================
    processMatchResult(
        tournamentId: string,
        dto: ProcessMatchResultDto
    ): OperationResult<ProcessMatchResultData> {
        const tournament = this.tournamentRepository.findById(tournamentId);
        if (!tournament) {
            return failure('TOURNAMENT_NOT_FOUND', 'Tournoi introuvable');
        }

        if (tournament.status !== 'IN_PROGRESS') {
            return failure('TOURNAMENT_NOT_IN_PROGRESS', 'Le tournoi n\'est pas en cours');
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
        let updatedBracket = this.bracketService.advanceWinner(
            tournament.bracketData,
            dto.gameId,
            dto.winnerId,
            dto.score
        );

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
        if (isTournamentComplete) {
            this.tournamentRepository.updateStatus(
                tournamentId,
                'FINISHED',
                tournament.version + 1
            );

            const winnerId = this.bracketService.getFinalWinnerId(updatedBracket);
            if (winnerId) {
                this.participantRepository.updateRank(winnerId, tournamentId, 1);
                winner = this.participantRepository.findById(winnerId, tournamentId) ?? undefined;
            }
        }

        const updatedTournament = this.tournamentRepository.findById(tournamentId);
        if (!updatedTournament) {
            return failure('TOURNAMENT_NOT_FOUND', 'Erreur lors de la récupération du tournoi');
        }

        const completedMatch = this.bracketService.getMatchByGameId(updatedBracket, dto.gameId)!;

        // Émettre les événements WebSocket
        this.emitToTournament(tournamentId, 'match:completed', {
            tournamentId,
            match: completedMatch,
            winnerId: dto.winnerId,
            score: dto.score,
        });

        if (isRoundComplete && nextRound) {
            this.emitToTournament(tournamentId, 'round:completed', {
                tournamentId,
                completedRound: nextRound - 1,
                nextRound,
            });
        }

        if (isTournamentComplete) {
            this.emitToTournament(tournamentId, 'tournament:completed', {
                tournamentId,
                winner,
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
    // HELPERS
    // =========================================================================

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
}
