import {
	HttpException,
	Inject,
	InjectPlugin,
	Service,
	UnauthorizedException,
} from 'my-fastify-decorators';
import config from '../config.js';
import {
	base32ToBuffer,
	bufferToBase32,
	generateTOTPSecret,
	hashPassword,
	linkTOTPSecret,
	verifyPassword,
	verifyTOTP,
} from '../utils/crypto.js';
import { DbExchangeService } from './dbExchange.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

import type { JWT } from '@fastify/jwt';
import { RabbitMQClient } from 'my-fastify-decorators-microservices';
import { ProviderBasic, ProviderKeys, providers } from './providers.js';

export type JwtPayload = {
	id: number;
	email: string;
	username: string;
	provider: string;
	noUsername?: boolean;
	suggestedUsername?: string;
	twoFA?: boolean;           // 2FA activée sur le compte
	twoFAVerified?: boolean;   // 2FA vérifiée pour cette session
	isGuest?: boolean;         // Mode guest (connexion sans compte)
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

class TooManyRequestsException extends HttpException {
	constructor(message = 'Too Many Requests', payload?: unknown) {
		super(message, 429, payload);
	}
}

class BadRequestException extends HttpException {
	constructor(message = 'Bad Request', payload?: unknown) {
		super(message, 400, payload);
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
	avatar: string;
	login: string; // GitHub
	username: string; // Discord
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

	@InjectPlugin('mq')
	private mq!: RabbitMQClient;

	@InjectPlugin('users')
	private users!: RabbitMQClient;

	async register(dto: RegisterDto): Promise<AuthTokens> {
		const { email, password } = dto;
		const existing = await this.dbExchange.existing(email);
		if (existing) {
			throw new UnauthorizedException('User already exists');
		}

		const hashedPassword = await hashPassword(password);

		const info = await this.dbExchange.addUser(email, hashedPassword);
		this.users.publish('user.created', { id: Number(info.lastInsertRowid), provider: 'email' });
		return this.generateTokens(Number(info.lastInsertRowid), email, '', 'email', { noUsername: true });
	}

	async createGuest(username: string): Promise<AuthTokens> {
		username = username.trim();

		if (username === '') {
			throw new BadRequestException('Username cannot be empty');
		}

		if (username.length < 3) {
			throw new BadRequestException('Username must be at least 3 characters long');
		}

		const existingUser = await this.dbExchange.getUserByUsername(username);
		if (existingUser) {
			throw new BadRequestException('Username already exists');
		}

		const info = await this.dbExchange.addGuestUser(username);
		const guestId = Number(info.lastInsertRowid);

		return this.generateTokens(guestId, '', username, 'guest', { isGuest: true });
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

		// Vérifier si la 2FA est activée
		const totpInfo = await this.dbExchange.getTOTPInfo(user.id);
		const has2FA = totpInfo?.totp_enabled === 1;

		if (!user.username || user.username === '') {
			// va demander un username plus tard

			const data: Record<string, unknown> = { noUsername: true };
			if (has2FA) {
				//normalement pas possible...
				data.twoFA = true;
				data.twoFAVerified = false;
			}
			return this.generateTokens(user.id, user.email, '', 'email', data);
		}

		// Si 2FA enable genere un token avec twoFAVerified: false
		if (has2FA) {
			return this.generateTokens(user.id, user.email, user.username, 'email', {
				twoFA: true,
				twoFAVerified: false,
			});
		}

		return this.generateTokens(user.id, user.email, user.username, 'email');
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
		const user = await this.dbExchange.getUserById(payload.id);

		if (!user) {
			throw new UnauthorizedException('User not found');
		}

		return {
			id: user.id,
			email: user.email,
			username: payload.username || user.username || '',
			noUsername: payload.noUsername || false,
			suggestedUsername: payload.suggestedUsername || undefined,
			twoFA: payload.twoFA || false,
			twoFAVerified: payload.twoFAVerified || false,
			isGuest: payload.isGuest || false,
		};
	}

	async getRefreshToken(refreshToken: string) {
		return this.jwt.verify(refreshToken);
	}

	async refresh(refreshToken: string, currentPayload?: JwtPayload): Promise<AuthTokens> {
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

		const provider = currentPayload?.provider || 'email';
		const isGuest = provider === 'guest';

		if (isGuest) {
			return this.generateTokens(
				user.id,
				user.email || '',
				user.username || '',
				'guest',
				{ isGuest: true },
			);
		}

		// check si state est 2FA
		const totpInfo = await this.dbExchange.getTOTPInfo(user.id);
		const has2FA = totpInfo?.totp_enabled === 1;

		const data: Record<string, unknown> = {};

		if (!user.username || user.username === '') {
			data.noUsername = true;
		}

		if (has2FA) {
			data.twoFA = true;
			// Conserve le state de 2FA
			data.twoFAVerified = currentPayload?.twoFAVerified || false;
		}

		return this.generateTokens(
			user.id,
			user.email,
			user.username || '',
			provider,
			Object.keys(data).length > 0 ? data : undefined,
		);
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
				body: JSON.stringify({
					...providers[provider].body,
					code,
					redirect_uri: config.redirectUri + '/api/auth/' + provider + '/callback',
				}),
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
					redirect_uri: config.redirectUri + '/api/auth/' + provider + '/callback',
				}).toString(),
			});
		}

		if (!tokenRes.ok) throw new BadGatewayException(`${providers[provider].id} login failed`);

		const tokenData: TokenData = (await tokenRes.json()) as TokenData;
		if (tokenData.error)
			throw new UnauthorizedException(`${providers[provider].id} login failed`);

		let userRes: Response | null = null;
		if (tokenData.token_type.toLowerCase() == 'bearer') {
			userRes = await fetch(providers[provider].userInfoUrl, {
				headers: { Authorization: `Bearer ${tokenData.access_token}` },
			});
		} else {
			throw new BadGatewayException(`${provider} - TA OUBLIER UN TRUC POUR LE PROVIDER!`);
		}

		if (!userRes.ok) throw new BadGatewayException(`${providers[provider].id} login failed`);

		const userData: UserData = (await userRes.json()) as UserData;
		let user = await this.dbExchange.getUserByProviderId(provider, String(userData.id));

		// Extraire le username suggéré du provider (login pour GitHub, username pour Discord)
		const suggestedUsername = userData.login || userData.username || '';

		if (!user) {
			const info = await this.dbExchange.addUserByProviderId(provider, String(userData.id));
			if (!userData?.avatar_url && provider === 'discord' && userData.avatar) {
				if (userData.avatar.startsWith('a_')) {
					// a_ => animate => image gif
					userData.avatar_url = `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.gif`;
				} else {
					userData.avatar_url = `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.webp`;
				}
			}
			this.users.publish('user.created', { id: Number(info.lastInsertRowid), provider, avatar_url: userData.avatar_url });
			user = { id: Number(info.lastInsertRowid), email: userData.email, password_hash: '', username: '' };
		}

		if (!user?.username || user?.username === '') {
			// va demander un username plus tard, avec suggestion du provider
			return this.generateTokens(user?.id, user?.email, '', provider, {
				noUsername: true,
				suggestedUsername
			});
		}
		return this.generateTokens(user.id, userData.email || '', user.username, provider);
	}

	private async generateTokens(userId: number, email: string, username: string, provider: string, data : Record<string, any> = {}) {
		const accessToken = this.jwt.sign({ id: userId, email, username, provider, ...data }, { expiresIn: config.jwt.expiresIn });

		const refreshToken = this.jwt.sign(
			{ id: userId, type: 'refresh' },
			{ expiresIn: config.jwt.refreshTokenExpiresIn },
		);

		const expiresAt = new Date(Date.now() + config.jwt.refreshTokenRotation).toISOString();

		try {
			await this.dbExchange.storeRefreshToken(userId, refreshToken, expiresAt);
		} catch (error) {
			throw new TooManyRequestsException('Stop Spamming refresh Token Generation !');
		}

		return { accessToken, refreshToken };
	}


	async addUsername(userId: number, username: string): Promise<AuthTokens> {
		username = username.trim();

		if (username === '') {
			throw new BadRequestException('Username cannot be empty');
		}

		if (username.length < 3) {
			throw new BadRequestException('Username must be at least 3 characters long');
		}

		if (await this.dbExchange.getUserByUsername(username)) {
			throw new UnauthorizedException('Username already exists');
		}
		await this.dbExchange.updateUsername(userId, username);

		const user = await this.dbExchange.getUserById(userId);
		if (!user) {
			throw new UnauthorizedException('User not found');
		}

		try {
		this.users.publish('user.updated.username', { id: userId, username });
		} catch (error) { }
		// Générer de nouveaux tokens avec le username
		return this.generateTokens(user.id, user.email || '', username, 'email');
	}

	// ---------------------- 2FA TOTP Methods ----------------------

	async enable2FA(userId: number, email: string): Promise<{ link: string; secret: string }> {
		// check si 2FA est deja enable
		const totpInfo = await this.dbExchange.getTOTPInfo(userId);
		if (totpInfo?.totp_enabled === 1) {
			throw new BadRequestException('2FA is already enabled');
		}

		// Genere un nouveau secret TOTP
		const secretBuffer = generateTOTPSecret();
		const secretBase32 = bufferToBase32(secretBuffer);

		// Stocker le secret en mode pending
		await this.dbExchange.setTOTPSecret(userId, secretBase32);

		// Genere le lien otpauth://
		const link = linkTOTPSecret(secretBuffer, 'Transcendance', email || `user-${userId}`);

		return { link, secret: secretBase32 };
	}

	async verify2FASetup(userId: number, code: string): Promise<AuthTokens> {
		const totpInfo = await this.dbExchange.getTOTPInfo(userId);

		if (!totpInfo) {
			throw new UnauthorizedException('User not found');
		}

		if (totpInfo.totp_enabled === 1) {
			throw new BadRequestException('2FA is already enabled');
		}

		if (totpInfo.totp_pending !== 1 || !totpInfo.totp_secret) {
			throw new BadRequestException('2FA setup not initiated');
		}

		const secretBuffer = base32ToBuffer(totpInfo.totp_secret);
		const isValid = verifyTOTP(secretBuffer, code);

		if (!isValid) {
			throw new UnauthorizedException('Invalid TOTP code');
		}

		// Enable 2FA
		await this.dbExchange.enableTOTP(userId);

		const user = await this.dbExchange.getUserById(userId);
		if (!user) {
			throw new UnauthorizedException('User not found');
		}

		return this.generateTokens(user.id, user.email || '', user.username || '', 'email', {
			twoFA: true,
			twoFAVerified: true,
		});
	}

	async verify2FA(userId: number, code: string): Promise<AuthTokens> {
		const totpInfo = await this.dbExchange.getTOTPInfo(userId);

		if (!totpInfo || totpInfo.totp_enabled !== 1 || !totpInfo.totp_secret) {
			throw new BadRequestException('2FA is not enabled');
		}

		const secretBuffer = base32ToBuffer(totpInfo.totp_secret);
		const isValid = verifyTOTP(secretBuffer, code);

		if (!isValid) {
			throw new UnauthorizedException('Invalid TOTP code');
		}

		const user = await this.dbExchange.getUserById(userId);
		if (!user) {
			throw new UnauthorizedException('User not found');
		}

		return this.generateTokens(user.id, user.email || '', user.username || '', 'email', {
			twoFA: true,
			twoFAVerified: true,
		});
	}

	async disable2FA(userId: number, twoFAVerified: boolean): Promise<AuthTokens> {
		const totpInfo = await this.dbExchange.getTOTPInfo(userId);

		if (!totpInfo || totpInfo.totp_enabled !== 1) {
			throw new BadRequestException('2FA is not enabled');
		}

		if (!twoFAVerified) {
			throw new UnauthorizedException('2FA verification required to disable 2FA');
		}

		await this.dbExchange.disableTOTP(userId);

		const user = await this.dbExchange.getUserById(userId);
		if (!user) {
			throw new UnauthorizedException('User not found');
		}

		return this.generateTokens(user.id, user.email || '', user.username || '', 'email');
	}

	// ---------------------- Password Reset Methods ----------------------

	private generateOTP(): string {
		return Math.floor(100000 + Math.random() * 900000).toString();
	}

	async forgotPassword(email: string): Promise<void> {
		const user = await this.dbExchange.getUserByEmail(email);
		if (!user) {
			return;
		}

		const otp = this.generateOTP();

		await this.dbExchange.storePasswordResetOTP(email, otp);

		this.mq.emit('send_otp', { mail: email, otp }, 'mail_queue');
	}

	async verifyResetOTP(email: string, otp: string): Promise<boolean> {

		const storedOTP = await this.dbExchange.getPasswordResetOTP(email);

		if (!storedOTP) {
			throw new BadRequestException('Invalid or expired OTP');
		}

		if (storedOTP.otp !== otp) {
			throw new BadRequestException('Invalid OTP');
		}

		await this.dbExchange.markOTPAsVerified(email, otp);

		return true;
	}

	async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
		const verifiedOTP = await this.dbExchange.getVerifiedOTP(email, otp);

		if (!verifiedOTP) {
			throw new BadRequestException('OTP not verified or expired');
		}

		const hashedPassword = await hashPassword(newPassword);

		const result = await this.dbExchange.updateUserPassword(email, hashedPassword);

		if (result.changes === 0) {
			throw new BadRequestException('Failed to update password');
		}

		await this.dbExchange.deletePasswordResetOTPs(email);
	}

	// ---------------------- Account Management Methods ----------------------

	async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
		const user = await this.dbExchange.getUserById(userId);
		if (!user || !user.password_hash) {
			throw new UnauthorizedException('User not found or no password set');
		}

		const isValid = await verifyPassword(currentPassword, user.password_hash);
		if (!isValid) {
			throw new UnauthorizedException('Current password is incorrect');
		}

		const hashedPassword = await hashPassword(newPassword);
		await this.dbExchange.updatePasswordById(userId, hashedPassword);

		try {
			this.users.publish('user.updated.password', { id: userId });
		} catch (error) {}
	}

	async updateUsername(userId: number, newUsername: string): Promise<AuthTokens> {
		newUsername = newUsername.trim();

		if (newUsername === '') {
			throw new BadRequestException('Username cannot be empty');
		}

		if (newUsername.length < 3) {
			throw new BadRequestException('Username must be at least 3 characters long');
		}
		
		
		const existingUser = await this.dbExchange.getUserByUsername(newUsername);
		if (existingUser && existingUser.id !== userId) {
			throw new UnauthorizedException('Username already exists');
		}

		await this.dbExchange.updateUsername(userId, newUsername);

		const user = await this.dbExchange.getUserById(userId);
		if (!user) {
			throw new UnauthorizedException('User not found');
		}

		try {
			this.users.publish('user.updated.username', { id: userId, username: newUsername });
		} catch (error) { }

		const totpInfo = await this.dbExchange.getTOTPInfo(userId);
		const has2FA = totpInfo?.totp_enabled === 1;

		const data: Record<string, unknown> = {};
		if (has2FA) {
			data.twoFA = true;
			data.twoFAVerified = true;
		}

		return this.generateTokens(user.id, user.email || '', newUsername, 'email', data);
	}

	async deleteAccount(userId: number): Promise<void> {
		const user = await this.dbExchange.getUserById(userId);
		if (!user) {
			throw new UnauthorizedException('User not found');
		}

		await this.dbExchange.revokeAllUserRefreshTokens(userId);

		await this.dbExchange.deleteUser(userId);

		try {
			this.users.publish('user.deleted', { id: userId });
		} catch (error) { }
	}

	async updateEmail(userId: number, newEmail: string): Promise<AuthTokens> {
		const user = await this.dbExchange.getUserById(userId);
		if (!user) {
			throw new UnauthorizedException('User not found');
		}

		const existingUser = await this.dbExchange.existing(newEmail);
		if (existingUser && existingUser.id !== userId) {
			throw new UnauthorizedException('Email already in use');
		}

		await this.dbExchange.updateEmailById(userId, newEmail);

		try {
			this.users.publish('user.updated.email', { id: userId, email: newEmail });
		} catch (error) { }

		const totpInfo = await this.dbExchange.getTOTPInfo(userId);
		const has2FA = totpInfo?.totp_enabled === 1;

		const data: Record<string, unknown> = {};
		if (has2FA) {
			data.twoFA = true;
			data.twoFAVerified = true;
		}

		return this.generateTokens(user.id, newEmail, user.username || '', 'email', data);
	}
}
