import { Guard, CanActivateContext, Service, InjectPlugin } from 'my-fastify-decorators';
import type { JWT } from '@fastify/jwt';
import config from '../config.js';

export type JwtPayload = {
	id: number;
	email: string;
	username: string;
	provider: string;
	noUsername?: boolean;
	suggestedUsername?: string;
	iat: number;
	exp: number;
};

@Service()
export class OptionalAuthGuard implements Guard {
    @InjectPlugin('jwt')
    private jwt!: JWT;

    async canActivate(context: CanActivateContext): Promise<boolean> {
        const { req } = context;
        const accessToken = (req.cookies as Record<string, string>)?.[config.accessTokenName as string];

        if (!accessToken) {
            (req as any).user = null;
            return true; // Guest mode
        }

        try {
            const payload = this.jwt.verify<JwtPayload>(accessToken);
            (req as any).user = payload;
        } catch {
            (req as any).user = null;
        }
        return true;
    }
}