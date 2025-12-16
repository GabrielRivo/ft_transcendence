import type { FastifyReply } from 'fastify';
import {
	Body,
	BodySchema,
	Controller,
	Get,
	Inject,
	Param,
	Post,
	Query,
	Res,
} from 'my-fastify-decorators';

import { AuthService } from './auth.service.js';
import { DbExchangeService } from './dbExchange.service.js';
import { LoginDto, LoginSchema } from './dto/login.dto.js';
import { RegisterDto, RegisterSchema } from './dto/register.dto.js';
import type { ProviderKeys } from './providers.js';
import { providers } from './providers.js';

@Controller('/auth')
export class AuthController {
	@Inject(AuthService)
	private authService!: AuthService;

	// Warning: a delete plus tard
	@Inject(DbExchangeService)
	private dbExchangeService!: DbExchangeService;

	@Post('/register')
	@BodySchema(RegisterSchema)
	async register(@Body() dto: RegisterDto) {
		return this.authService.register(dto);
	}

	@Post('/login')
	@BodySchema(LoginSchema)
	async login(@Body() dto: LoginDto) {
		return this.authService.login(dto);
	}

	//warning: dangereux faire attention
	@Get('/users')
	async getAllUsers() {
		return this.dbExchangeService.getAllUsers();
	}

	@Get('/:provider/callback')
	async callback(@Param('provider') provider: ProviderKeys, @Query('code') code: string) {
		return this.authService.handleCallback(code, provider);
	}

	@Get('/:provider/redirect/uri')
	async redirectUri(@Param('provider') provider: ProviderKeys, @Res() res: FastifyReply) {
		res.redirect(providers[provider].authorizationUrl);
	}
}
