import { RecordedEvent } from "./base-event.js";
import { TournamentSize, TournamentVisibility } from "../entities/tournament.js";

export enum TournamentEventType {
    CREATED = 'TournamentCreated',
    PLAYER_JOINED = 'PlayerJoined',
    PLAYER_LEFT = 'PlayerLeft',
    STARTED = 'TournamentStarted',
    CANCELLED = 'TournamentCancelled',
    MATCH_FINISHED = 'MatchFinished',
    FINISHED = 'TournamentFinished',
    BRACKET_UPDATED = 'BracketUpdated',
}

export class TournamentCreatedEvent implements RecordedEvent {
    public readonly eventName = TournamentEventType.CREATED;
    public readonly occurredAt = new Date();

    constructor(
        public readonly aggregateId: string,
        public readonly name: string,
        public readonly size: TournamentSize,
        public readonly ownerId: string,
        public readonly visibility: TournamentVisibility
    ) { }
}

export class PlayerJoinedEvent implements RecordedEvent {
    public readonly eventName = TournamentEventType.PLAYER_JOINED;
    public readonly occurredAt = new Date();

    constructor(
        public readonly aggregateId: string,
        public readonly playerId: string,
        public readonly displayName: string,
        public readonly name: string,
        public readonly ownerId: string
    ) { }
}

export class TournamentStartedEvent implements RecordedEvent {
    public readonly eventName = TournamentEventType.STARTED;
    public readonly occurredAt = new Date();

    constructor(public readonly aggregateId: string) { }
}

export class TournamentCancelledEvent implements RecordedEvent {
    public readonly eventName = TournamentEventType.CANCELLED;
    public readonly occurredAt = new Date();

    constructor(
        public readonly aggregateId: string,
        public readonly name: string,
        public readonly ownerId: string
    ) { }
}

export class MatchFinishedEvent implements RecordedEvent {
    public readonly eventName = TournamentEventType.MATCH_FINISHED;
    public readonly occurredAt = new Date();

    constructor(
        public readonly aggregateId: string,
        public readonly matchId: string,
        public readonly winnerId: string
    ) { }
}

export class TournamentFinishedEvent implements RecordedEvent {
    public readonly eventName = TournamentEventType.FINISHED;
    public readonly occurredAt = new Date();

    constructor(
        public readonly aggregateId: string,
        public readonly winnerId: string,
        public readonly name: string,
        public readonly ownerId: string
    ) { }
}

export class PlayerLeftEvent implements RecordedEvent {
    public readonly eventName = TournamentEventType.PLAYER_LEFT;
    public readonly occurredAt = new Date();

    constructor(
        public readonly aggregateId: string,
        public readonly playerId: string,
        public readonly name: string,
        public readonly ownerId: string
    ) { }
}

export class BracketUpdatedEvent implements RecordedEvent {
    public readonly eventName = TournamentEventType.BRACKET_UPDATED;
    public readonly occurredAt = new Date();

    constructor(public readonly aggregateId: string) { }
}
