import {
	HttpException,
	Inject,
	InjectPlugin,
	Service,
	UnauthorizedException,
} from 'my-fastify-decorators';
import config from '../config.js';
import { hashPassword, verifyPassword } from '../utils/crypto.js';
import { DbExchangeService } from './dbExchange.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

import type { JWT } from '@fastify/jwt';
import { ProviderBasic, ProviderKeys, providers } from './providers.js';

export type JwtPayload = {
	sub: number;
	email: string;
	iat: number;
	exp: number;
};

export type AuthTokens = {
	accessToken: string;
	refreshToken: string;
};

// WARNING a rajouter dans my-fastify-decorators
class BadGatewayException extends HttpException {
	constructor(message = 'Bad Gateway', payload?: unknown) {
		super(message, 502, payload);
	}
}

type TokenData = {
	token_type: 'bearer' | 'Bearer';
	access_token: string;
	refresh_token: string;
	error: string;
};

type UserData = {
	id: number;
	email: string;
	avatar_url: string;
	login: string;
	name: string;
	provider: string;
	provider_id: string;
	created_at: string;
	updated_at: string;
};

@Service()
export class AuthService {
	@Inject(DbExchangeService)
	private dbExchange!: DbExchangeService;

	@InjectPlugin('jwt')
	private jwt!: JWT;

	async register(dto: RegisterDto): Promise<AuthTokens> {
		const { email, password } = dto;
		const existing = await this.dbExchange.existing(email);
		if (existing) {
			throw new UnauthorizedException('User already exists');
		}

		const hashedPassword = await hashPassword(password);

		const info = await this.dbExchange.addUser(email, hashedPassword);

		return this.generateTokens(Number(info.lastInsertRowid), email);
	}

	async login(dto: LoginDto): Promise<AuthTokens> {
		const { email, password } = dto;

		const user = await this.dbExchange.getUserByEmail(email);
		if (!user || !user.password_hash) {
			throw new UnauthorizedException('Invalid credentials');
		}

		const isValid = await verifyPassword(password, user.password_hash);
		if (!isValid) {
			throw new UnauthorizedException('Invalid credentials');
		}

		return this.generateTokens(user.id, user.email);
	}


	verifyAccessToken(accessToken: string): JwtPayload {
		try {
			return this.jwt.verify<JwtPayload>(accessToken);
		} catch {
			throw new UnauthorizedException('Invalid or expired access token');
		}
	}


	async getUserFromToken(accessToken: string) {
		const payload = this.verifyAccessToken(accessToken);
		const user = await this.dbExchange.getUserById(payload.sub);

		if (!user) {
			throw new UnauthorizedException('User not found');
		}

		return {
			id: user.id,
			email: user.email,
		};
	}

	async getRefreshToken(refreshToken: string) {
		return this.jwt.verify(refreshToken);
	}

	async refresh(refreshToken: string): Promise<AuthTokens> {
		try {
			this.jwt.verify(refreshToken);
		} catch {
			throw new UnauthorizedException('Invalid refresh token signature');
		}

		const storedToken = await this.dbExchange.findRefreshToken(refreshToken);

		if (!storedToken) {
			throw new UnauthorizedException('Invalid refresh token (not found)');
		}

		if (storedToken.revoked === 1) {
			throw new UnauthorizedException('Refresh token revoked');
		}

		if (new Date(storedToken.expires_at) < new Date()) {
			throw new UnauthorizedException('Refresh token expired');
		}

		const user = await this.dbExchange.getUserById(storedToken.user_id);
		if (!user) throw new UnauthorizedException('User not found');

		await this.dbExchange.revokeRefreshToken(refreshToken);
		return this.generateTokens(user.id, user.email);
	}

	async logout(refreshToken: string): Promise<void> {
		if (!refreshToken) return;

		const storedToken = await this.dbExchange.findRefreshToken(refreshToken);

		if (storedToken) {
			await this.dbExchange.revokeRefreshToken(refreshToken);
		}
	}

	async handleCallback(code: string, provider: ProviderKeys) {
		let tokenRes: Response | null = null;

		if (providers[provider].contentType === 'application/json') {
			tokenRes = await fetch(providers[provider].accessTokenUrl, {
				method: 'POST',
				headers: { 'Content-Type': providers[provider].contentType, Accept: 'application/json' },
				body: JSON.stringify({ ...providers[provider].body, code }),
			});
		} else {
			tokenRes = await fetch(providers[provider].accessTokenUrl, {
				method: 'POST',
				headers: {
					Authorization: providers[provider as ProviderBasic].basic,
					'Content-Type': providers[provider].contentType,
				},
				body: new URLSearchParams({
					...providers[provider].body,
					code,
					redirect_uri: config.redirectUri + '/auth/' + provider + '/callback',
				}).toString(),
			});
		}

		if (!tokenRes.ok) throw new BadGatewayException(`${providers[provider].id} login failed 1`);

		const tokenData: TokenData = (await tokenRes.json()) as TokenData;
		if (tokenData.error)
			throw new UnauthorizedException(`${providers[provider].id} login failed 1`);

		let userRes: Response | null = null;
		console.log(tokenData);
		if (tokenData.token_type.toLowerCase() == 'bearer') {
			userRes = await fetch(providers[provider].userInfoUrl, {
				headers: { Authorization: `Bearer ${tokenData.access_token}` },
			});
		} else {
			throw new BadGatewayException(`${provider} - TA OUBLIER UN TRUC POUR LE PROVIDER!`);
		}

		if (!userRes.ok) throw new BadGatewayException(`${providers[provider].id} login failed`);

		console.log(userRes);
		const userData: UserData = (await userRes.json()) as UserData;

		let user = await this.dbExchange.getUserByProviderId(provider, String(userData.id));

		if (!user) {
			const info = await this.dbExchange.addUserByProviderId(provider, String(userData.id));
			user = { id: Number(info.lastInsertRowid), email: userData.email, password_hash: '' };
		}

		return this.generateTokens(user.id, userData.email || '');
	}

	private async generateTokens(userId: number, email: string) {
		const accessToken = this.jwt.sign({ sub: userId, email }, { expiresIn: config.jwt.expiresIn });

		const refreshToken = this.jwt.sign(
			{ sub: userId, type: 'refresh' },
			{ expiresIn: config.jwt.refreshTokenExpiresIn },
		);

		const expiresAt = new Date(Date.now() + config.jwt.refreshTokenRotation).toISOString();

		await this.dbExchange.storeRefreshToken(userId, refreshToken, expiresAt);

		return { accessToken, refreshToken };
	}
}
