import { RecordedEvent } from "../events/base-event.js"

export interface TournamentEventsPublisher {
    publish(event: RecordedEvent): Promise<void>;
    publishAll(events: ReadonlyArray<RecordedEvent>): Promise<void>;
}