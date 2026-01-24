import { RecordedEvent } from "../events/base-event.js"

export abstract class TournamentEventsPublisher {
    abstract publish(event: RecordedEvent): Promise<void>;
    abstract publishAll(events: ReadonlyArray<RecordedEvent>): Promise<void>;
}