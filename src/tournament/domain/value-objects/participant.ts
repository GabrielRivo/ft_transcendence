import { InvalidParticipantDataException } from "../exceptions.js";

export type ParticipantType = 'USER' | 'GUEST';

export class Participant {
    constructor(
        public readonly id: string,
        public readonly displayName: string,
        public readonly type: ParticipantType
    ) {
        this.validate();
    }

    private validate(): void {
        if (!this.id || this.id.trim() === '') {
            throw new InvalidParticipantDataException('ID cannot be empty or whitespace.');
        }

        if (!this.displayName || this.displayName.trim() === '') {
            throw new InvalidParticipantDataException('Display name cannot be empty or whitespace.');
        }

        if (this.displayName.length > 20) {
            throw new InvalidParticipantDataException('Display name is too long (max 20 chars).');
        }

        if (this.type !== 'USER' && this.type !== 'GUEST') {
            throw new InvalidParticipantDataException(`Invalid participant type: "${this.type}". Must be USER or GUEST.`);
        }
    }

    public static createGuest(sessionId: string, displayName: string): Participant {
        return new Participant(sessionId, displayName, 'GUEST');
    }

    public static createUser(userId: string, displayName: string): Participant {
        return new Participant(userId, displayName, 'USER');
    }

    public equals(other: Participant): boolean {
        return (
            this.id === other.id &&
            this.type === other.type &&
            this.displayName === other.displayName
        );
    }
}