import { RecordedEvent } from "./base-event.js";
import { TournamentSize } from "../entities/tournament.js";

export class TournamentCreatedEvent implements RecordedEvent {
    public readonly eventName = 'TournamentCreated';
    public readonly occurredAt = new Date();

    constructor(
        public readonly aggregateId: string,
        public readonly name: string,
        public readonly size: TournamentSize,
        public readonly ownerId: string
    ) {}
}

export class PlayerJoinedEvent implements RecordedEvent {
    public readonly eventName = 'PlayerJoined';
    public readonly occurredAt = new Date();

    constructor(
        public readonly aggregateId: string,
        public readonly playerId: string,
        public readonly displayName: string
    ) {}
}

export class TournamentStartedEvent implements RecordedEvent {
    public readonly eventName = 'TournamentStarted';
    public readonly occurredAt = new Date();

    constructor(public readonly aggregateId: string) {}
}

export class TournamentCancelledEvent implements RecordedEvent {
    public readonly eventName = 'TournamentCancelled';
    public readonly occurredAt = new Date();

    constructor(public readonly aggregateId: string) {}
}

export class MatchFinishedEvent implements RecordedEvent {
    public readonly eventName = 'MatchFinished';
    public readonly occurredAt = new Date();

    constructor(
        public readonly aggregateId: string,
        public readonly matchId: string,
        public readonly winnerId: string
    ) {}
}

export class TournamentFinishedEvent implements RecordedEvent {
    public readonly eventName = 'TournamentFinished';
    public readonly occurredAt = new Date();

    constructor(
        public readonly aggregateId: string, 
        public readonly winnerId: string
    ) {}
}