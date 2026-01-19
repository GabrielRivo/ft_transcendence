import { Service } from 'my-fastify-decorators';
import type { JwtPayload } from '../guards/optional-auth.guard.js';
import { Participant, ParticipantType } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export interface GuestInfo {
    alias: string;
    sessionId?: string;
}

@Service()
export class ParticipantService {
	createParticipant(user: JwtPayload | null, guestInfo?: GuestInfo): Participant {
		if (user) {
			return {
				id: String(user.id),
				alias: user.username,
				type: 'user' as ParticipantType,
				userId: String(user.id),
			};
		}
		if (guestInfo?.alias) {
			const validation = this.validateGuestAlias(guestInfo.alias);
			if (!validation.valid) {
				throw new Error(validation.error ?? 'Alias invité invalide');
			}
			return {
				id: guestInfo.sessionId || uuidv4(),
				alias: guestInfo.alias,
				type: 'guest' as ParticipantType,
				userId: null,
			};
		}
		throw new Error('Alias requis pour les participants invités');
	}

    validateGuestAlias(alias: string): { valid: boolean; error?: string } {
        if (!alias || alias.trim().length === 0) {
            return { valid: false, error: 'Alias is required' };
        }
        if (alias.length < 2 || alias.length > 20) {
            return { valid: false, error: 'Alias length must be between 2 and 20 characters' };
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
            return { valid: false, error: 'Alias can only contain letters, numbers, _ and -' };
        }
        return { valid: true };
    }
}
