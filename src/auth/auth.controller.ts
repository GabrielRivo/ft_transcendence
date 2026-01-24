import type { FastifyReply, FastifyRequest } from 'fastify';
import {
	Body,
	BodySchema,
	Controller,
	Get,
	Inject,
	NotFoundException,
	Param,
	Post,
	Query,
	Req,
	Res,
	UnauthorizedException,
	UseGuards,
	InjectPlugin
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
import { RabbitMQClient } from 'my-fastify-decorators-microservices';

// Extend FastifyRequest to include user from AuthGuard
interface AuthenticatedRequest extends FastifyRequest {
	user: JwtPayload;
}

@Controller('/auth')
export class AuthController {
	@Inject(AuthService)
	private authService!: AuthService;

	@InjectPlugin('mq')
	private mq!: RabbitMQClient;

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

	@Get('/verify')
	async verify(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
		const accessToken = (req.cookies as Record<string, string>)[config.accessTokenName];

		if (!accessToken) {
			throw new UnauthorizedException('No access token');
		}

		const payload = this.authService.verifyAccessToken(accessToken);
		// this.authService.verifyAccessToken(accessToken);

		res.header('X-User-Id', String(payload.id));
		res.header('X-User-Email', payload.email || '');

		return { valid: true };
	}

	@Get('/send-mail')
	async sendMail() {
		this.mq.emit('user_created', { email: 'test@test.com' }, 'mail_queue');
		return { success: true, message: 'Mail sent' };
	}

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

	@Post('/refresh')
	async refresh(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
		const refreshToken = (req.cookies as Record<string, string>)[config.refreshTokenName];

		if (!refreshToken) {
			throw new UnauthorizedException('No refresh token');
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

	@Get('/user-by-username/:username')
	async getUserByUsername(@Param('username') username: string) {
		const user = await this.dbExchangeService.getUserByUsername(username);
		if (!user) {
			throw new NotFoundException('User not found');
		}
		return { id: user.id, username: user.username };
	}

	@Get('/user-by-id/:id')
	async getUserById(@Param('id') id: number) {
		const user = await this.dbExchangeService.getUserById(id);
		if (!user) {
			throw new NotFoundException('Id not found');
		}
		return { id: user.id, username: user.username };
	}

	@Get('/user-is-exist/:id')
	async isExist(@Param('id') id: number){
		const user = await this.dbExchangeService.getUserById(id);
		if (!user) {
			return { exist : false}
		}
		return { exist : true };
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
