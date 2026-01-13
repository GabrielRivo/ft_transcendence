import type { Database, RunResult, Statement } from 'better-sqlite3';
import { InjectPlugin, Service } from 'my-fastify-decorators';
import { ProviderKeys } from './providers.js';

@Service()
export class DbExchangeService {
	private existingPrepare: Statement<{ email: string }>;
	private addUserPrepare: Statement<{ email: string; password_hash: string }>;
	private getUserByEmailPrepare: Statement<{ email: string, }>;
	private getUserByIdPrepare: Statement<{ id: number }>;
	private storeRefreshTokenPrepare: Statement<{
		user_id: number;
		token: string;
		expires_at: string;
	}>;
	private revokeRefreshTokenPrepare: Statement<{ token: string }>;
	private generateTokensPrepare: Statement<{ id: number }>;
	private getRefreshTokenPrepare: Statement<{ token: string }>;
	private getUserByProviderIdPrepare: Statement<{ provider: ProviderKeys; provider_id: string }>;
	private addUserByProviderIdPrepare: Statement<{
		provider: ProviderKeys;
		provider_id: string;
		password_hash: string;
	}>;
	private findRefreshTokenPrepare: Statement<{ token: string }>;
	private getAllUsersPrepare: Statement<Record<string, never>>;
	private updateUsernamePrepare: Statement<{ userId: number; username: string }>;
	private getUserByUsernamePrepare: Statement<{ username: string }>;

	@InjectPlugin('db')
	private db!: Database;

	onModuleInit() {
		this.existingPrepare = this.db.prepare('SELECT id FROM users WHERE email = @email');
		this.addUserPrepare = this.db.prepare(
			'INSERT INTO users (email, password_hash) VALUES (@email, @password_hash)',
		);
		this.getUserByEmailPrepare = this.db.prepare(
			"SELECT * FROM users WHERE email = @email AND provider = 'email'",
		);
		this.getUserByIdPrepare = this.db.prepare('SELECT * FROM users WHERE id = @id');
		this.storeRefreshTokenPrepare = this.db.prepare(
			'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (@user_id, @token, @expires_at)',
		);
		this.revokeRefreshTokenPrepare = this.db.prepare(
			'UPDATE refresh_tokens SET revoked = 1 WHERE token = @token',
		);
		this.generateTokensPrepare = this.db.prepare('SELECT * FROM users WHERE id = @id');
		this.getRefreshTokenPrepare = this.db.prepare(
			'SELECT * FROM refresh_tokens WHERE token = @token AND revoked = 0',
		);
		this.getUserByProviderIdPrepare = this.db.prepare(
			'SELECT * FROM users WHERE provider = @provider AND provider_id = @provider_id',
		);
		this.addUserByProviderIdPrepare = this.db.prepare(
			'INSERT INTO users (provider, provider_id, password_hash) VALUES (@provider, @provider_id, @password_hash)',
		);
		this.findRefreshTokenPrepare = this.db.prepare(
			'SELECT * FROM refresh_tokens WHERE token = @token',
		);
		this.getAllUsersPrepare = this.db.prepare('SELECT * FROM users');
		this.updateUsernamePrepare = this.db.prepare('UPDATE users SET username = @username WHERE id = @userId');
		this.getUserByUsernamePrepare = this.db.prepare('SELECT * FROM users WHERE username = @username');

	}

	async existing(email: string) {
		return this.existingPrepare.get({ email }) as { id: number } | undefined;
	}

	async addUser(email: string, password_hash: string) {
		return this.addUserPrepare.run({ email, password_hash }) as RunResult;
	}

	async getUserByEmail(email: string) {
		return this.getUserByEmailPrepare.get({ email }) as
			| { id: number; email: string; password_hash: string; username: string }
			| undefined;
	}

	async getUserById(id: number) {
		return this.getUserByIdPrepare.get({ id }) as
			| { id: number; email: string; password_hash: string; username: string }
			| undefined;
	}

	async storeRefreshToken(user_id: number, token: string, expires_at: string) {
		return this.storeRefreshTokenPrepare.run({ user_id, token, expires_at }) as RunResult;
	}

	async revokeRefreshToken(token: string) {
		return this.revokeRefreshTokenPrepare.run({ token }) as RunResult;
	}

	async generateTokens(id: number) {
		return this.generateTokensPrepare.get({ id }) as
			| { id: number; email: string; password_hash: string }
			| undefined;
	}

	async getRefreshToken(token: string) {
		return this.getRefreshTokenPrepare.get({ token }) as
			| { id: number; user_id: number; token: string; expires_at: string; revoked: number }
			| undefined;
	}

	async getUserByProviderId(provider: ProviderKeys, provider_id: string) {
		return this.getUserByProviderIdPrepare.get({ provider, provider_id }) as
			| { id: number; email: string; password_hash: string; username: string }
			| undefined;
	}

	async addUserByProviderId(provider: ProviderKeys, provider_id: string) {
		return this.addUserByProviderIdPrepare.run({
			provider,
			provider_id,
			password_hash: '',
		}) as RunResult;
	}

	async findRefreshToken(token: string) {
		return this.findRefreshTokenPrepare.get({ token }) as
			| { id: number; user_id: number; token: string; expires_at: string; revoked: number }
			| undefined;
	}

	async getAllUsers() {
		return this.getAllUsersPrepare.all({}) as
			| { id: number; email: string; provider: ProviderKeys; provider_id: string }[]
			| undefined;
	}

	async updateUsername(userId: number, username: string) {
		return this.updateUsernamePrepare.run({ userId, username }) as RunResult;
	}

	async getUserByUsername(username: string) {
		return this.getUserByUsernamePrepare.get({ username }) as
			| { id: number; username: string }
			| undefined;
	}
}
