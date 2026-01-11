import type { FastifyRequest, FastifyReply } from 'fastify';
import { Guard, CanActivateContext, Service, Inject, UnauthorizedException } from 'my-fastify-decorators';
import { AuthService } from '../auth.service.js';
import config from '../../config.js';


@Service()
export class AuthGuard implements Guard {
	@Inject(AuthService)
	private authService!: AuthService;

	async canActivate(context: CanActivateContext<FastifyRequest, FastifyReply>): Promise<boolean> {
		const { req } = context;
		const accessToken = (req.cookies as Record<string, string>)[config.accessTokenName];

		if (!accessToken) throw new UnauthorizedException('No access token');

		try {
			const payload = this.authService.verifyAccessToken(accessToken);
            (req as any).user = payload;
			return true;
		} catch {
			throw new UnauthorizedException('Invalid access token');
		}
	}
}

