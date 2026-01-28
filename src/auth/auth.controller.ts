import type { FastifyReply, FastifyRequest } from 'fastify';
import {
	BadRequestException,
	Body,
	BodySchema,
	Controller,
	Delete,
	Get,
	Inject,
	JWTBody,
	Param,
	Patch,
	Post,
	Query,
	Req,
	Res,
	UnauthorizedException,
	UseGuards
} from 'my-fastify-decorators';

import config from '../config.js';
import { AuthService, AuthTokens, JwtPayload } from './auth.service.js';

import { ChangeEmailDto, ChangeEmailSchema } from './dto/changeEmail.dto.js';
import { ChangePasswordDto, ChangePasswordSchema } from './dto/changePassword.dto.js';
import { ForgotPasswordDto, ForgotPasswordSchema } from './dto/forgotPassword.dto.js';
import { GuestDto, GuestSchema } from './dto/guest.dto.js';
import { LoginDto, LoginSchema } from './dto/login.dto.js';
import { RegisterDto, RegisterSchema } from './dto/register.dto.js';
import { ResetPasswordDto, ResetPasswordSchema } from './dto/resetPassword.dto.js';
import { SetUsernameDto, SetUsernameSchema } from './dto/setUsername.dto.js';
import { TwoFAVerifyDto, TwoFAVerifySchema } from './dto/twofa.dto.js';
import { VerifyResetOtpDto, VerifyResetOtpSchema } from './dto/verifyResetOtp.dto.js';

import { AuthGuard } from './guards/auth.guard.js';
import type { ProviderKeys } from './providers.js';
import { providers } from './providers.js';


interface AuthenticatedRequest extends FastifyRequest {
	user: JwtPayload;
}

@Controller('/auth')
export class AuthController {
	@Inject(AuthService)
	private authService!: AuthService;

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
	async register(@Body() dto: RegisterDto, @Res() res: FastifyReply, @JWTBody() jwt: { id : number}) {
		if (jwt?.id) {
			throw new UnauthorizedException('User already logged in');
		}
		const tokens = await this.authService.register(dto);
		this.setAuthCookies(res, tokens);
		return { success: true, message: 'Registration successful' };
	}

	@Post('/login')
	@BodySchema(LoginSchema)
	async login(@Body() dto: LoginDto, @Res() res: FastifyReply, @JWTBody() jwt: { id : number}) {
		// pas besoin de reelement check le guard, valide ou pas si le mec ce fait passer pour connecter ben il est connecter cela n'aura aucun impact server...
		if (jwt?.id) {
			throw new UnauthorizedException('User already logged in');
		}
		// Je pourrais faire un guard...

		const tokens = await this.authService.login(dto);
		this.setAuthCookies(res, tokens);
		return { success: true, message: 'Login successful' };
	}

	@Post('/guest')
	@BodySchema(GuestSchema)
	async guest(@Body() dto: GuestDto, @Res() res: FastifyReply, @JWTBody() jwt: { id : number}) {
		if (jwt?.id) {
			throw new UnauthorizedException('User already logged in');
		}
		const tokens = await this.authService.createGuest(dto.username);
		this.setAuthCookies(res, tokens);
		return { success: true, message: 'Guest login successful' };
	}

	@Get('/verify')
	async verify(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
		const accessToken = (req.cookies as Record<string, string>)[config.accessTokenName];

		if (!accessToken) {
			throw new UnauthorizedException('No access token');
		}

		const payload = this.authService.verifyAccessToken(accessToken);

		// Les guests sont unauthorized sur les routes guard par verify classique
		if (payload.provider === 'guest') {
			throw new UnauthorizedException('Guest users are not authorized');
		}

		// Si 2FA enable mais non checked, rejeter la request
		if (payload.twoFA && !payload.twoFAVerified) {
			throw new UnauthorizedException('2FA verification required');
		}

		res.header('X-User-Id', String(payload.id));
		res.header('X-User-Email', payload.email || '');

		return { valid: true };
	}

	@Get('/verifyGuest')
	async verifyGuest(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
		const accessToken = (req.cookies as Record<string, string>)[config.accessTokenName];

		if (!accessToken) {
			throw new UnauthorizedException('No access token');
		}

		const payload = this.authService.verifyAccessToken(accessToken);

		if (payload.provider !== 'guest') {
			if (payload.twoFA && !payload.twoFAVerified) {
				throw new UnauthorizedException('2FA verification required');
			}
		}

		res.header('X-User-Id', String(payload.id));
		res.header('X-User-Email', payload.email || '');

		return { valid: true };
	}

	@Get('/me')
	async me(@Req() req: FastifyRequest) {
		const accessToken = (req.cookies as Record<string, string>)[config.accessTokenName];

		console.log(accessToken);
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
		const accessToken = (req.cookies as Record<string, string>)[config.accessTokenName];

		if (!refreshToken) {
			throw new UnauthorizedException('No refresh token');
		}

		// Essayer de recup le payload actuel pour conserver le state 2FA
		let currentPayload;
		if (accessToken) {
			try {
				currentPayload = this.authService.verifyAccessToken(accessToken);
			} catch {
				// Token experer ou invalide, on continue sans le payload
			}
		}

		const tokens = await this.authService.refresh(refreshToken, currentPayload);
		this.setAuthCookies(res, tokens);
		return { success: true, message: 'Token refreshed' };
	}


	@Post('/logout')
	async logout(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
		const refreshToken = (req.cookies as Record<string, string>)[config.refreshTokenName];
		const accessToken = (req.cookies as Record<string, string>)[config.accessTokenName];

		let payload;
		if (accessToken) {
			payload = this.authService.verifyAccessToken(accessToken);
		}

		if (refreshToken) {
			await this.authService.logout(refreshToken);
		}

		if (payload && payload?.isGuest) {
			await this.authService.deleteAccount(payload.id);
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

	// ---------------------- 2FA Endpoints ----------------------

	@Post('/2fa/enable')
	@UseGuards(AuthGuard)
	async enable2FA(@Req() req: AuthenticatedRequest) {
		if (req.user.isGuest || req.user.provider !== 'email') {
			throw new UnauthorizedException('You cannot enable 2FA');
		}
		const { link, secret } = await this.authService.enable2FA(req.user.id, req.user.email);
		return { success: true, link, secret };
	}


	@Post('/2fa/verify-setup')
	@UseGuards(AuthGuard)
	@BodySchema(TwoFAVerifySchema)
	async verify2FASetup(
		@Body() dto: TwoFAVerifyDto,
		@Req() req: AuthenticatedRequest,
		@Res() res: FastifyReply,
	) {
		if (req.user.isGuest || req.user.provider !== 'email') {
			throw new UnauthorizedException('You cannot verify 2FA setup');
		}
		const tokens = await this.authService.verify2FASetup(req.user.id, dto.code);
		this.setAuthCookies(res, tokens);
		return { success: true, message: '2FA enabled successfully' };
	}

	@Post('/2fa/verify')
	@BodySchema(TwoFAVerifySchema)
	async verify2FA(
		@Body() dto: TwoFAVerifyDto,
		@Req() req: FastifyRequest,
		@Res() res: FastifyReply,
	) {
		const accessToken = (req.cookies as Record<string, string>)[config.accessTokenName];

		if (!accessToken) {
			throw new UnauthorizedException('No access token');
		}

		const payload = this.authService.verifyAccessToken(accessToken);

		if (!payload.twoFA) {
			throw new UnauthorizedException('2FA is not enabled');
		}

		if (payload.twoFAVerified) {
			throw new UnauthorizedException('2FA already verified');
		}

		const tokens = await this.authService.verify2FA(payload.id, dto.code);
		this.setAuthCookies(res, tokens);
		return { success: true, message: '2FA verified successfully' };
	}

	@Delete('/2fa')
	@UseGuards(AuthGuard)
	async disable2FA(@Req() req: AuthenticatedRequest, @Res() res: FastifyReply) {
		if (req.user.isGuest || req.user.provider !== 'email') {
			throw new UnauthorizedException('You cannot disable 2FA');
		}
		
		const tokens = await this.authService.disable2FA(
			req.user.id,
			req.user.twoFAVerified || false,
		);
		this.setAuthCookies(res, tokens);
		return { success: true, message: '2FA disabled successfully' };
	}

	// ---------------------- Password Reset Endpoints ----------------------

	@Post('/forgot-password')
	@BodySchema(ForgotPasswordSchema)
	async forgotPassword(@Body() body: ForgotPasswordDto) {
		await this.authService.forgotPassword(body.email);
		// Toujours retourner success pour eviter de savoir si le mail est existant ou pas
		return { success: true, message: 'If the email exists, a reset code has been sent' };
	}

	@Post('/verify-reset-otp')
	@BodySchema(VerifyResetOtpSchema)
	async verifyResetOtp(@Body() body: VerifyResetOtpDto) {
		const valid = await this.authService.verifyResetOTP(body.email, body.otp);
		return { success: true, valid, message: 'OTP verified successfully' };
	}

	@Post('/reset-password')
	@BodySchema(ResetPasswordSchema)
	async resetPassword(@Body() body: ResetPasswordDto) {
		await this.authService.resetPassword(body.email, body.otp, body.newPassword);
		return { success: true, message: 'Password has been reset successfully' };
	}

	// ---------------------- Account Management Endpoints ----------------------

	@Patch('/password')
	@UseGuards(AuthGuard)
	@BodySchema(ChangePasswordSchema)
	async changePassword(
		@Body() dto: ChangePasswordDto,
		@Req() req: AuthenticatedRequest,
	) {
		if (req.user.isGuest || req.user.provider !== 'email') {
			throw new UnauthorizedException('You cannot update your password');
		}
		await this.authService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
		return { success: true, message: 'Password changed successfully' };
	}

	@Patch('/username')
	@UseGuards(AuthGuard)
	@BodySchema(SetUsernameSchema)
	async updateUsername(
		@Body() dto: SetUsernameDto,
		@Req() req: AuthenticatedRequest,
		@Res() res: FastifyReply,
	) {
		if (req.user.isGuest || req.user.provider !== 'email') {
			throw new UnauthorizedException('You cannot update your username');
		}
		const username = dto.username.trim();

		if (username === '') {
			throw new BadRequestException('Username cannot be empty');
		}

		if (username.length < 3) {
			throw new BadRequestException('Username must be at least 3 characters long');
		}
		const tokens = await this.authService.updateUsername(req.user.id, username);
		this.setAuthCookies(res, tokens);
		return { success: true, message: 'Username updated successfully' };
	}

	@Patch('/email')
	@UseGuards(AuthGuard)
	@BodySchema(ChangeEmailSchema)
	async updateEmail(
		@Body() dto: ChangeEmailDto,
		@Req() req: AuthenticatedRequest,
		@Res() res: FastifyReply,
	) {
		if (req.user.isGuest || req.user.provider !== 'email') {
			throw new UnauthorizedException('You cannot update your email');
		}
		const tokens = await this.authService.updateEmail(req.user.id, dto.email);
		this.setAuthCookies(res, tokens);
		return { success: true, message: 'Email updated successfully' };
	}

	@Delete('/account')
	@UseGuards(AuthGuard)
	async deleteAccount(
		@Req() req: AuthenticatedRequest,
		@Res() res: FastifyReply,
	) {
		await this.authService.deleteAccount(req.user.id);
		this.clearAuthCookies(res);
		return { success: true, message: 'Account deleted successfully' };
	}
}
