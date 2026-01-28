import { randomInt, randomUUID } from "crypto";
import { Match } from "./match.js";
import { Participant } from "../value-objects/participant.js";
import { RecordedEvent } from "../events/base-event.js";
import {
    PlayerJoinedEvent,
    MatchFinishedEvent,
    TournamentCancelledEvent,
    TournamentCreatedEvent,
    TournamentFinishedEvent,
    TournamentStartedEvent,
    PlayerLeftEvent,
    BracketUpdatedEvent
} from "../events/tournament-events.js";
import {
    DuplicateParticipantNameException,
    InvalidTournamentSizeException,
    InvalidTournamentStateException,
    MatchNotFoundException,
    PlayerAlreadyRegisteredException,
    TournamentCannotBeCancelledException,
    TournamentEnrollmentClosedException,
    TournamentFullException,
    TournamentNotReadyToStartException,
    PlayerNotRegisteredException
} from "../exceptions.js";

export const TOURNAMENT_STATUSES = ['CREATED', 'STARTED', 'FINISHED', 'CANCELED'] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];
export const TOURNAMENT_SIZES = [4, 8, 16] as const;
export type TournamentSize = (typeof TOURNAMENT_SIZES)[number];
export const TOURNAMENT_VISIBILITIES = ['PUBLIC', 'PRIVATE'] as const;
export type TournamentVisibility = (typeof TOURNAMENT_VISIBILITIES)[number];

/**
 * Generates a 6-digit invite code for tournaments
 * Uses crypto.randomInt for secure random number generation
 */
function generateInviteCode(): string {
    return randomInt(100000, 1000000).toString();
}

export class Tournament {
    private _participants: Participant[] = [];
    private _matches: Match[] = [];
    private _status: TournamentStatus = 'CREATED';
    private _winner: Participant | null = null;
    private _version: number = 0;

    private _recordedEvents: RecordedEvent[] = [];

    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly size: TournamentSize,
        public readonly ownerId: string,
        public readonly visibility: TournamentVisibility,
        public readonly inviteCode: string = generateInviteCode()
    ) {
        this.validateConfiguration();
        this.addRecordedEvent(new TournamentCreatedEvent(this.id, this.name, this.size, this.ownerId, this.visibility));
    }

    get participants(): Participant[] { return this._participants; }
    get matches(): Match[] { return this._matches; }
    get status(): TournamentStatus { return this._status; }
    get winner(): Participant | null { return this._winner; }
    get version(): number { return this._version; }

    public getRecordedEvents(): RecordedEvent[] { return this._recordedEvents; }
    public clearRecordedEvents(): void { this._recordedEvents = []; }
    public addRecordedEvent(event: RecordedEvent): void { this._recordedEvents.push(event); }

    public join(participant: Participant): void {
        this.ensureEnrollmentIsOpen();
        this.ensureParticipantUnique(participant);

        this._participants.push(participant);

        this.addRecordedEvent(new PlayerJoinedEvent(this.id, participant.id, participant.displayName, this.name, this.ownerId));

        if (this._participants.length === this.size) {
            this.start();
        }
    }

    public cancel(): void {
        if (this._status !== 'CREATED') {
            throw new TournamentCannotBeCancelledException(this._status);
        }
        this._status = 'CANCELED';
        this.addRecordedEvent(new TournamentCancelledEvent(this.id, this.name, this.ownerId));
    }

    public leave(playerId: string): void {
        this.ensureEnrollmentIsOpen();

        const index = this._participants.findIndex(p => p.id === playerId);
        if (index === -1) {
            throw new PlayerNotRegisteredException(playerId);
        }

        this._participants.splice(index, 1);
        this.addRecordedEvent(new PlayerLeftEvent(this.id, playerId, this.name, this.ownerId));
    }

    public onMatchFinished(matchId: string): void {
        const match: Match | undefined = this._matches.find(m => m.id === matchId);
        if (!match) {
            throw new MatchNotFoundException(matchId);
        }

        if (match.status !== 'FINISHED' || !match.winner) {
            throw new InvalidTournamentStateException(this._status, 'CLOSE_MATCH');
        }

        this.propagateWinnerToNextRound(match);

        this.addRecordedEvent(new MatchFinishedEvent(this.id, matchId, match.winner!.id));
    }

    public static reconstitute(
        data: {
            id: string, name: string, size: TournamentSize, ownerId: string,
            visibility: TournamentVisibility, inviteCode: string,
            status: TournamentStatus, participants: Participant[], matches: Match[],
            winner: Participant | null, version: number,
        }
    ): Tournament {
        const tournament = new Tournament(data.id, data.name, data.size, data.ownerId, data.visibility, data.inviteCode);
        tournament._status = data.status;
        tournament._participants = [...data.participants];
        tournament._matches = [...data.matches];
        tournament._winner = data.winner;
        tournament._version = data.version;
        tournament.clearRecordedEvents();
        return tournament;
    }

    public updateMatchScore(matchId: string, scoreA: number, scoreB: number, winnerId?: string | null): void {
        const match = this._matches.find(m => m.id === matchId);
        if (!match) throw new MatchNotFoundException(matchId);

        match.setScore(scoreA, scoreB);

        if (winnerId) {
            match.finalize(winnerId);
        }

        if (match.status === 'FINISHED') {
            this.propagateWinnerToNextRound(match);
            this.addRecordedEvent(new MatchFinishedEvent(this.id, matchId, match.winner!.id));
        }
    }

    public getCurrentRound(): number | null {
        if (this._status === 'FINISHED') return null;
        if (this._status === 'CREATED') return null;

        // Find the first round that has at least one match not finished
        // We assume rounds are 1, 2, 3...
        const totalRounds = Math.log2(this.size);
        for (let r = 1; r <= totalRounds; r++) {
            const matchesInRound = this._matches.filter(m => m.round === r);
            const allFinished = matchesInRound.every(m => m.status === 'FINISHED');
            if (!allFinished) {
                return r;
            }
        }
        return null;
    }

    public isRoundFinished(round: number): boolean {
        const matchesInRound = this._matches.filter(m => m.round === round);
        if (matchesInRound.length === 0) return false; // Should not happen
        return matchesInRound.every(m => m.status === 'FINISHED');
    }

    private start(): void {
        if (this._participants.length !== this.size) {
            throw new TournamentNotReadyToStartException(this._participants.length, this.size);
        }

        this._status = 'STARTED';
        this.generateBracket();
        this.addRecordedEvent(new TournamentStartedEvent(this.id));
    }

    private generateBracket(): void {
        const shuffledParticipants = [...this._participants].sort(() => Math.random() - 0.5);
        const totalRounds = Math.log2(this.size);
        this._matches = [];

        for (let round = 1; round <= totalRounds; round++) {
            const matchesInRound = this.size / Math.pow(2, round);

            for (let position = 1; position <= matchesInRound; position++) {
                let playerA: Participant | null = null;
                let playerB: Participant | null = null;

                if (round === 1) {
                    const indexA = (position - 1) * 2;
                    const indexB = indexA + 1;
                    playerA = shuffledParticipants[indexA]!;
                    playerB = shuffledParticipants[indexB]!;
                }

                const match = new Match(
                    randomUUID(),
                    round,
                    position,
                    playerA,
                    playerB
                );

                this._matches.push(match);
            }
        }
    }

    private propagateWinnerToNextRound(finishedMatch: Match): void {
        const nextRound = finishedMatch.round + 1;
        const totalRounds = Math.log2(this.size);

        if (finishedMatch.round === totalRounds) {
            this._winner = finishedMatch.winner;
            this._status = 'FINISHED';
            this.addRecordedEvent(new TournamentFinishedEvent(this.id, finishedMatch.winner!.id, this.name, this.ownerId));
            return;
        }

        const nextPosition = Math.ceil(finishedMatch.position / 2);
        const nextMatch = this._matches.find(m => m.round === nextRound && m.position === nextPosition);
        if (!nextMatch) {
            throw new InvalidTournamentStateException(this._status, `PROPAGATE (Next match R${nextRound} P${nextPosition} not found)`);
        }

        const slot = finishedMatch.position % 2 !== 0 ? 1 : 2;
        nextMatch.assignParticipant(slot, finishedMatch.winner!);

        this.addRecordedEvent(new BracketUpdatedEvent(this.id));
    }

    private validateConfiguration(): void {
        if (!TOURNAMENT_SIZES.includes(this.size)) {
            throw new InvalidTournamentSizeException(this.size);
        }
    }

    private ensureEnrollmentIsOpen(): void {
        if (this._status !== 'CREATED') {
            throw new TournamentEnrollmentClosedException(this.id, this._status);
        }

        if (this._participants.length >= this.size) {
            throw new TournamentFullException(this.id);
        }
    }

    private ensureParticipantUnique(newParticipant: Participant): void {
        if (this._participants.some(p => p.id === newParticipant.id)) {
            throw new PlayerAlreadyRegisteredException(newParticipant.id);
        }

        if (this._participants.some(p => p.displayName === newParticipant.displayName)) {
            throw new DuplicateParticipantNameException(newParticipant.displayName);
        }
    }
}
