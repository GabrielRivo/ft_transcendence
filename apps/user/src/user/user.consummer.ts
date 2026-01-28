import { Controller, Inject } from 'my-fastify-decorators';
import { EventPattern, Payload } from 'my-fastify-decorators-microservices';
import { UserService } from './user.service.js';

interface UserCreatedPayloadMailProvider {
	id: number;
	provider: 'mail';
}

interface UserCreatedPayloadExternalProvider {
	id: number;
	provider: 'discord' | 'github';
	avatar_url: string;
}

type UserCreatedPayload = UserCreatedPayloadMailProvider | UserCreatedPayloadExternalProvider;

interface UserUpdatedPayload {
	id: number;
	username: string;
}

interface UserDeletedPayload {
	id: number;
}

@Controller()
export class UserConsummer {
	@Inject(UserService)
	private userService!: UserService;

	@EventPattern('user.created')
	async handleUserCreated(@Payload() payload: UserCreatedPayload) {
		console.log('[UserConsummer] User created event received:', payload);

		// Recup seulement l'avatar url si le provider est external
		const avatarUrl = 'avatar_url' in payload ? payload.avatar_url : null;

		this.userService.initProfile(payload.id, avatarUrl);
	}

	@EventPattern('user.updated.username')
	async handleUserUpdated(@Payload() payload: UserUpdatedPayload) {
		console.log('[UserConsummer] User updated event received:', payload);

		this.userService.updateUsername(payload.id, payload.username);
	}

	@EventPattern('user.deleted')
	async handleUserDeleted(@Payload() payload: UserDeletedPayload) {
		console.log('[UserConsummer] User deleted event received:', payload);

		this.userService.deleteProfile(payload.id);
	}
}
