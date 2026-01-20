import { randomUUID } from "crypto";
import { Match } from "./match.js";
import { Participant } from "../value-objects/participant.js";
import { RecordedEvent } from "../events/base-event.js";
import { 
    PlayerJoinedEvent,
    MatchFinishedEvent, 
    TournamentCancelledEvent,
    TournamentCreatedEvent,
    TournamentFinishedEvent,
    TournamentStartedEvent
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
    TournamentNotReadyToStartException
} from "../exceptions.js";

export const TOURNAMENT_STATUSES = ['CREATED', 'STARTED', 'FINISHED', 'CANCELED'] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];
export const TOURNAMENT_SIZES = [4, 8, 16] as const;
export type TournamentSize = (typeof TOURNAMENT_SIZES)[number];

export class Tournament {
    private _participants: Participant[] = [];
    private _matches: Match[] = [];
    private _status: TournamentStatus = 'CREATED';
    private _winner: Participant | null = null;

    private _recordedEvents: RecordedEvent[] = [];

    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly size: TournamentSize,
        public readonly ownerId: string
    ) {
        this.validateConfiguration();
        this.addRecordedEvent(new TournamentCreatedEvent(this.id, this.name, this.size, this.ownerId));
    }

    get participants(): Participant[] { return this._participants; }
    get matches(): Match[] { return this._matches; }
    get status(): TournamentStatus { return this._status; }
    get winner(): Participant | null { return this._winner; }

    public getRecordedEvents(): RecordedEvent[] { return this._recordedEvents; }
    public clearRecordedEvents(): void { this._recordedEvents = []; }
    public addRecordedEvent(event: RecordedEvent): void { this._recordedEvents.push(event); }

    public join(participant: Participant): void {
        this.ensureEnrollmentIsOpen();
        this.ensureParticipantUnique(participant);
        
        this._participants.push(participant);

        this.addRecordedEvent(new PlayerJoinedEvent(this.id, participant.id, participant.displayName));

        if (this._participants.length === this.size) {
            this.start();
        }
    }

    public cancel(): void {
        if (this._status !== 'CREATED') {
            throw new TournamentCannotBeCancelledException(this._status);
        }
        this._status = 'CANCELED';
        this.addRecordedEvent(new TournamentCancelledEvent(this.id));
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
            status: TournamentStatus, participants: Participant[], matches: Match[], winner: Participant | null
        }
    ) : Tournament {
        const tournament = new Tournament(data.id, data.name, data.size, data.ownerId);
        tournament._status = data.status;
        tournament._participants = [...data.participants];
        tournament._matches = [...data.matches];
        tournament._winner = data.winner;
        tournament.clearRecordedEvents();
        return tournament;
    }

    public updateMatchScore(matchId: string, scoreA: number, scoreB: number): void {
        const match = this._matches.find(m => m.id === matchId);
        if (!match) throw new MatchNotFoundException(matchId);

        match.setScore(scoreA, scoreB);

        if (match.status === 'FINISHED') {
            this.propagateWinnerToNextRound(match);
            this.addRecordedEvent(new MatchFinishedEvent(this.id, matchId, match.winner!.id));
        }
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
        const shuffledParticipants = [...this._participants].sort(() => Math.random () - 0.5);
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
            this.addRecordedEvent(new TournamentFinishedEvent(this.id, finishedMatch.winner!.id));
            return;
        }

        const nextPosition = Math.ceil(finishedMatch.position / 2);
        const nextMatch = this._matches.find(m => m.round === nextRound && m.position === nextPosition);
        if (!nextMatch) {
            throw new InvalidTournamentStateException(this._status, `PROPAGATE (Next match R${nextRound} P${nextPosition} not found)`);
        }

        const slot = finishedMatch.position % 2 !== 0 ? 1 : 2;
        nextMatch.assignParticipant(slot, finishedMatch.winner!);
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
