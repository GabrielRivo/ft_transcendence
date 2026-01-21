export interface RecordedEvent {
    readonly eventName: string;
    readonly occurredAt: Date;
    readonly aggregateId: string;
}