export abstract class DomainException extends Error {
    abstract readonly code: string;

    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class InvalidTournamentSizeException extends DomainException {
    readonly code = 'INVALID_TOURNAMENT_SIZE';

    constructor(public readonly receivedSize: number) {
        super(`Invalid tournament size: ${receivedSize}. Allowed sizes are 4, 8, or 16.`);
    }
}

export class InvalidParticipantDataException extends DomainException {
    readonly code = 'INVALID_PARTICIPANT_DATA';

    constructor(public readonly reason: string) {
        super(`Invalid participant data: ${reason}`);
    }
}

export class TournamentFullException extends DomainException {
    readonly code = 'TOURNAMENT_FULL';

    constructor(public readonly tournamentId: string) {
        super(`Tournament ${tournamentId} is full and cannot accept more participants`);
    }
}

export class TournamentEnrollmentClosedException extends DomainException {
    readonly code = 'TOURNAMENT_ENROLLMENT_CLOSED';

    constructor(public readonly tournamentId: string, public readonly status: string) {
        super(`Cannot join tournament ${tournamentId}. Enrollment is closed (Status: ${status}).`);
    }
}

export class PlayerAlreadyRegisteredException extends DomainException {
    readonly code = 'PLAYER_ALREADY_REGISTERED';

    constructor(public readonly playerId: string) {
        super(`Player ${playerId} is already registered in this tournament.`);
    }
}

export class DuplicateParticipantNameException extends DomainException {
    readonly code = 'DUPLICATE_PARTICIPANT_NAME';

    constructor(public readonly displayName: string) {
        super(`The display name ${displayName} is already in use by another participant.`);
    }
}

export class PlayerAlreadyInActiveTournamentException extends DomainException {
    readonly code = 'PLAYER_BUSY_IN_OTHER_TOURNAMENT';

    constructor(public readonly playerId: string, public readonly activeTournamentId: string) {
        super(`Player ${playerId} is already active in another started tournament (${activeTournamentId}).`);
    }
}

export class InvalidTournamentStateException extends DomainException {
    readonly code: string = 'INVALID_TOURNAMENT_STATE';

    constructor(public readonly currentState: string, public readonly action: string) {
        super(`Cannot perform action "${action}" when tournament is in state "${currentState}".`);
    }
}

export class TournamentCannotBeCancelledException extends InvalidTournamentStateException {
    override readonly code = 'TOURNAMENT_CANNOT_BE_CANCELLED';

    constructor(currentState: string) {
        super(currentState, 'CANCEL');
    }
}

export class TournamentNotReadyToStartException extends InvalidTournamentStateException {
    override readonly code = 'TOURNAMENT_NOT_READY_TO_START';

    constructor(currentCount: number, requiredCount: number) {
        super('CREATED', `START (Player count: ${currentCount}/${requiredCount})`);
    }
}

export class MatchNotFoundException extends DomainException {
    override readonly code = 'MATCH_NOT_FOUND';

    constructor(public readonly matchId: string) {
        super(`Match ${matchId} not found in this tournament.`);
    }
}

export class MatchAlreadyFinishedException extends DomainException {
    override readonly code = 'MATCH_ALREADY_FINISHED';

    constructor(public readonly matchId: string) {
        super(`Match ${matchId} is already finished. Cannot update score or declare walkover.`);
    }
}

export class InvalidMatchScoreException extends DomainException {
    override readonly code = 'INVALID_MATCH_SCORE';

    constructor(public readonly scoreA: number, public readonly scoreB: number) {
        super(`Invalid match score submitted: ${scoreA}-${scoreB}. Rules violation.`);
    }
}

export class MatchNotReadyException extends DomainException {
    override readonly code = 'MATCH_NOT_READY';

    constructor(public readonly matchId: string) {
        super(`Match ${matchId} cannot be played yet. Opponents are not determined.`);
    }
}

export class PlayerNotInMatchException extends DomainException {
    override readonly code = 'PLAYER_NOT_IN_MATCH';

    constructor(public readonly playerId: string, public readonly matchId: string) {
        super(`Player ${playerId} is not part of match ${matchId}.`);
    }
}

export class MatchAlreadyStartedException extends DomainException {
    override readonly code = 'MATCH_ALREADY_STARTED';

    constructor(public readonly matchId: string) {
        super(`Match ${matchId} is already started. Cannot assign participants.`);
    }
}