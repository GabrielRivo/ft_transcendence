import { Participant } from "../value-objects/participant.js";
import { 
    InvalidMatchScoreException, 
    MatchAlreadyFinishedException, 
    MatchAlreadyStartedException,
    MatchNotReadyException,
    PlayerNotInMatchException
} from "../exceptions.js";

export type MatchStatus = 'PENDING' | 'IN_PROGRESS' | 'FINISHED';
export type WinReason = 'SCORE' | 'WALKOVER';

export class Match {
    private _scoreA: number = 0;
    private _scoreB: number = 0;
    private _winner: Participant | null = null;
    private _status: MatchStatus = 'PENDING';
    private _winReason: WinReason | null = null;

    private _playerA: Participant | null = null;
    private _playerB: Participant | null = null;

    constructor(
        public readonly id: string,
        public readonly round: number,
        public readonly position: number,
        playerA: Participant | null,
        playerB: Participant | null
    ) {
        this._playerA = playerA;
        this._playerB = playerB;
        this.checkAutoStart();
    }

    get scoreA(): number { return this._scoreA; }
    get scoreB(): number { return this._scoreB; }
    get winner(): Participant | null { return this._winner; }
    get status(): MatchStatus { return this._status; }
    get winReason(): WinReason | null { return this._winReason; }
    get playerA(): Participant | null { return this._playerA; }
    get playerB(): Participant | null { return this._playerB; }

    public assignParticipant(position: 1 | 2, participant: Participant): void {
        if (this._status !== 'PENDING') {
            throw new MatchAlreadyStartedException(this.id);
        }

        if (position === 1) this._playerA = participant;
        else this._playerB = participant;

        this.checkAutoStart();
    }

    public setScore(scoreA: number, scoreB: number): void {
        this.ensureMatchIsPlayable();

        if (scoreA < 0 || scoreB < 0) {
            throw new InvalidMatchScoreException(scoreA, scoreB);
        }

        this._scoreA = scoreA;
        this._scoreB = scoreB;

        const isScoreReached = this._scoreA >= 11 || this._scoreB >= 11;
        if (isScoreReached) {
            const winner = this._scoreA > this._scoreB ? this._playerA! : this._playerB!;
            this.finishMatch(winner, 'SCORE');
        }
    }

    public declareWalkover(winnerId: string): void {
        if (this._status === 'FINISHED') {
            throw new MatchAlreadyFinishedException(this.id);
        }

        if (!this._playerA || !this._playerB) {
            throw new MatchNotReadyException(this.id);
        }

        const winner = this._playerA.id === winnerId ? this._playerA : this._playerB.id === winnerId ? this._playerB : null;
        if (!winner) {
            throw new PlayerNotInMatchException(winnerId, this.id);
        }

        this.finishMatch(winner, 'WALKOVER');
    }

    private ensureMatchIsPlayable(): void {
        if (this._status === 'FINISHED') {
            throw new MatchAlreadyFinishedException(this.id);
        }

        if (!this.isReady()) {
            throw new MatchNotReadyException(this.id);
        }

        if (this._status === 'PENDING') {
            this._status = 'IN_PROGRESS';
        }
    }

    private finishMatch(winner: Participant, reason: WinReason): void {
        this._winner = winner;
        this._status = 'FINISHED';
        this._winReason = reason;
    }

    public isReady(): boolean {
        return this._playerA !== null && this._playerB !== null;
    }

    private checkAutoStart(): void {
        if (this._status === 'PENDING' && this.isReady()) {
            this._status = 'IN_PROGRESS';
        }
    }
}