import type { FastifyReply, FastifyRequest } from 'fastify';
import {
	Body,
	BodySchema,
	Controller,
	Get,
	Inject,
	Param,
	Post,
	Query,
	Req,
	Res,
	UseGuards,
} from 'my-fastify-decorators';

import config from '../config.js';
import { AuthService, AuthTokens, JwtPayload } from './auth.service.js';
import { DbExchangeService } from './dbExchange.service.js';
import { LoginDto, LoginSchema } from './dto/login.dto.js';
import { RegisterDto, RegisterSchema } from './dto/register.dto.js';
import { SetUsernameDto, SetUsernameSchema } from './dto/setUsername.dto.js';
import { AuthGuard } from './guards/auth.guard.js';
import type { ProviderKeys } from './providers.js';
import { providers } from './providers.js';

// Extend FastifyRequest to include user from AuthGuard
interface AuthenticatedRequest extends FastifyRequest {
	user: JwtPayload;
}

@Controller('/auth')
export class AuthController {
	@Inject(AuthService)
	private authService!: AuthService;

	// Warning: a delete plus tard
	@Inject(DbExchangeService)
	private dbExchangeService!: DbExchangeService;

	private setAuthCookies(res: FastifyReply, tokens: AuthTokens): void {
		res.setCookie(config.accessTokenName, tokens.accessToken, {
			...config.cookie,
			maxAge: config.jwt.accessTokenMaxAge / 1000, // Convert to seconds
		});

		res.setCookie(config.refreshTokenName, tokens.refreshToken, {
			...config.cookie,
			path: '/api/auth',
			maxAge: config.jwt.refreshTokenMaxAge / 1000,
		});
	}

	private clearAuthCookies(res: FastifyReply): void {
		res.clearCookie(config.accessTokenName, { path: '/' });
		res.clearCookie(config.refreshTokenName, { path: '/api/auth' });
	}

	@Post('/register')
	@BodySchema(RegisterSchema)
	async register(@Body() dto: RegisterDto, @Res() res: FastifyReply) {
		const tokens = await this.authService.register(dto);
		this.setAuthCookies(res, tokens);
		return { success: true, message: 'Registration successful' };
	}

	@Post('/login')
	@BodySchema(LoginSchema)
	async login(@Body() dto: LoginDto, @Res() res: FastifyReply) {
		const tokens = await this.authService.login(dto);
		this.setAuthCookies(res, tokens);
		return { success: true, message: 'Login successful' };
	}

	/**
	 * Verify endpoint for nginx auth_request
	 * Returns 200 if valid, 401 if invalid
	 * Sets X-User-Id and X-User-Email headers for upstream services
	 */
	@Get('/verify')
	async verify(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
		const accessToken = (req.cookies as Record<string, string>)[config.accessTokenName];

		if (!accessToken) {
			res.status(401).send({ error: 'No access token' });
			return;
		}

		const payload = this.authService.verifyAccessToken(accessToken);

		// Set headers for upstream services
		res.header('X-User-Id', String(payload.id));
		res.header('X-User-Email', payload.email || '');

		return { valid: true };
	}

	/**
	 * Get current user info from access token
	 */
	@Get('/me')
	async me(@Req() req: FastifyRequest) {
		const accessToken = (req.cookies as Record<string, string>)[config.accessTokenName];

		if (!accessToken) {
			return { authenticated: false, user: null };
		}

		try {
			const user = await this.authService.getUserFromToken(accessToken);
			return { authenticated: true, user };
		} catch {
			return { authenticated: false, user: null };
		}
	}

	/**
	 * Refresh access token using refresh token cookie
	 */
	@Post('/refresh')
	async refresh(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
		const refreshToken = (req.cookies as Record<string, string>)[config.refreshTokenName];

		if (!refreshToken) {
			res.status(401).send({ error: 'No refresh token' });
			return;
		}

		const tokens = await this.authService.refresh(refreshToken);
		this.setAuthCookies(res, tokens);
		return { success: true, message: 'Token refreshed' };
	}

	/**
	 * Logout - revoke refresh token and clear cookies
	 */
	@Post('/logout')
	async logout(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
		const refreshToken = (req.cookies as Record<string, string | undefined>)[config.refreshTokenName];

		if (refreshToken) {
			await this.authService.logout(refreshToken);
		}
		this.clearAuthCookies(res);

		return { success: true, message: 'Logged out' };
	}

	/**
	 * Set username for authenticated user without one
	 * Protected by AuthGuard - user payload available in req.user
	 */
	@Post('/username')
	@UseGuards(AuthGuard)
	@BodySchema(SetUsernameSchema)
	async setUsername(
		@Body() dto: SetUsernameDto,
		@Req() req: AuthenticatedRequest,
		@Res() res: FastifyReply,
	) {
		console.log(req.user);
		const tokens = await this.authService.addUsername(req.user.id, dto.username);
		this.setAuthCookies(res, tokens);

		return { success: true, message: 'Username set successfully' };
	}

	//warning: dangereux faire attention
	@Get('/users')
	async getAllUsers() {
		return this.dbExchangeService.getAllUsers();
	}

	@Get('/:provider/callback')
	async callback(
		@Param('provider') provider: ProviderKeys,
		@Query('code') code: string,
		@Res() res: FastifyReply,
	) {
		const tokens = await this.authService.handleCallback(code, provider);
		this.setAuthCookies(res, tokens);
		res.redirect(config.redirectUri + '/dashboard');
	}

	@Get('/:provider/redirect/uri')
	async redirectUri(@Param('provider') provider: ProviderKeys, @Res() res: FastifyReply) {
		res.redirect(providers[provider].authorizationUrl);
	}
}
