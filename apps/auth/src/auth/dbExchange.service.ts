import type { Database, RunResult, Statement } from 'better-sqlite3';
import { InjectPlugin, Service } from 'my-fastify-decorators';
import { ProviderKeys } from './providers.js';

@Service()
export class DbExchangeService {
	private existingPrepare: Statement<{ email: string }>;
	private addUserPrepare: Statement<{ email: string; password_hash: string }>;
	private getUserByEmailPrepare: Statement<{ email: string }>;
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
	private addGuestUserPrepare: Statement<{ username: string }>;

	// 2FA TOTP prepared statements
	private setTOTPSecretPrepare: Statement<{ userId: number; secret: string }>;
	private enableTOTPPrepare: Statement<{ userId: number }>;
	private disableTOTPPrepare: Statement<{ userId: number }>;
	private getTOTPInfoPrepare: Statement<{ userId: number }>;

	// Password reset OTP prepared statements
	private storePasswordResetOTPPrepare: Statement<{ email: string; otp: string }>;
	private getPasswordResetOTPPrepare: Statement<{ email: string }>;
	private markOTPAsVerifiedPrepare: Statement<{ email: string; otp: string }>;
	private deletePasswordResetOTPsPrepare: Statement<{ email: string }>;
	private updateUserPasswordPrepare: Statement<{ email: string; password_hash: string }>;

	// Account management prepared statements
	private updatePasswordByIdPrepare: Statement<{ userId: number; password_hash: string }>;
	private revokeAllUserRefreshTokensPrepare: Statement<{ userId: number }>;
	private deleteUserPrepare: Statement<{ userId: number }>;
	private updateEmailByIdPrepare: Statement<{ userId: number; email: string }>;

	// Cleanup
	private deleteExpiredTokensPrepare: Statement<Record<string, never>>;
	private deleteExpiredOTPsPrepare: Statement<Record<string, never>>;
	private cleanupInterval: NodeJS.Timeout;

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
		this.updateUsernamePrepare = this.db.prepare(
			'UPDATE users SET username = @username WHERE id = @userId',
		);
		this.getUserByUsernamePrepare = this.db.prepare(
			'SELECT * FROM users WHERE username = @username',
		);
		this.addGuestUserPrepare = this.db.prepare(
			"INSERT INTO users (username, password_hash, provider) VALUES (@username, '', 'guest')",
		);

		// 2FA TOTP prepared statements
		this.setTOTPSecretPrepare = this.db.prepare(
			'UPDATE users SET totp_secret = @secret, totp_pending = 1, totp_enabled = 0 WHERE id = @userId',
		);
		this.enableTOTPPrepare = this.db.prepare(
			'UPDATE users SET totp_enabled = 1, totp_pending = 0 WHERE id = @userId',
		);
		this.disableTOTPPrepare = this.db.prepare(
			'UPDATE users SET totp_secret = NULL, totp_enabled = 0, totp_pending = 0 WHERE id = @userId',
		);
		this.getTOTPInfoPrepare = this.db.prepare(
			'SELECT totp_secret, totp_enabled, totp_pending FROM users WHERE id = @userId',
		);

		// Password reset OTP prepared statements
		this.storePasswordResetOTPPrepare = this.db.prepare(
			'INSERT INTO password_reset_otp (email, otp) VALUES (@email, @otp)',
		);
		this.getPasswordResetOTPPrepare = this.db.prepare(
			`SELECT * FROM password_reset_otp 
			 WHERE email = @email 
			 AND verified = 0 
			 AND datetime(created_at, '+10 minutes') > datetime('now') 
			 ORDER BY created_at DESC 
			 LIMIT 1`,
		);
		this.markOTPAsVerifiedPrepare = this.db.prepare(
			'UPDATE password_reset_otp SET verified = 1 WHERE email = @email AND otp = @otp',
		);
		this.deletePasswordResetOTPsPrepare = this.db.prepare(
			'DELETE FROM password_reset_otp WHERE email = @email',
		);
		this.updateUserPasswordPrepare = this.db.prepare(
			"UPDATE users SET password_hash = @password_hash WHERE email = @email AND provider = 'email'",
		);

		// Account management prepared statements
		this.updatePasswordByIdPrepare = this.db.prepare(
			'UPDATE users SET password_hash = @password_hash WHERE id = @userId',
		);
		this.revokeAllUserRefreshTokensPrepare = this.db.prepare(
			'UPDATE refresh_tokens SET revoked = 1 WHERE user_id = @userId',
		);
		this.deleteUserPrepare = this.db.prepare('DELETE FROM users WHERE id = @userId');
		this.updateEmailByIdPrepare = this.db.prepare(
			'UPDATE users SET email = @email WHERE id = @userId',
		);

		// Cleanup prepared statements
		this.deleteExpiredTokensPrepare = this.db.prepare(
			"DELETE FROM refresh_tokens WHERE expires_at < datetime('now')",
		);
		this.deleteExpiredOTPsPrepare = this.db.prepare(
			"DELETE FROM password_reset_otp WHERE datetime(created_at, '+10 minutes') < datetime('now')",
		);

		// Start cleanup interval (every 1 hour)
		this.cleanupInterval = setInterval(
			() => {
				this.runCleanup();
			},
			1000 * 60 * 60,
		);
	}

	onModuleDestroy() {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
	}

	private runCleanup() {
		try {
			this.deleteExpiredTokensPrepare.run({});
			this.deleteExpiredOTPsPrepare.run({});
		} catch (err) {
			console.error('Cleanup failed:', err);
		}
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

	async addGuestUser(username: string) {
		return this.addGuestUserPrepare.run({ username }) as RunResult;
	}

	// ---------------------- 2FA TOTP Methods ----------------------

	async setTOTPSecret(userId: number, secret: string) {
		return this.setTOTPSecretPrepare.run({ userId, secret }) as RunResult;
	}

	async enableTOTP(userId: number) {
		return this.enableTOTPPrepare.run({ userId }) as RunResult;
	}

	async disableTOTP(userId: number) {
		return this.disableTOTPPrepare.run({ userId }) as RunResult;
	}

	async getTOTPInfo(userId: number) {
		return this.getTOTPInfoPrepare.get({ userId }) as
			| { totp_secret: string | null; totp_enabled: number; totp_pending: number }
			| undefined;
	}

	// ---------------------- Password Reset OTP Methods ----------------------

	async storePasswordResetOTP(email: string, otp: string) {
		return this.storePasswordResetOTPPrepare.run({ email, otp }) as RunResult;
	}

	async getPasswordResetOTP(email: string) {
		return this.getPasswordResetOTPPrepare.get({ email }) as
			| { id: number; email: string; otp: string; verified: number; created_at: string }
			| undefined;
	}

	async getVerifiedOTP(email: string, otp: string) {
		const stmt = this.db.prepare(
			`SELECT * FROM password_reset_otp 
			 WHERE email = @email 
			 AND otp = @otp 
			 AND verified = 1 
			 AND datetime(created_at, '+10 minutes') > datetime('now') 
			 LIMIT 1`,
		);
		return stmt.get({ email, otp }) as
			| { id: number; email: string; otp: string; verified: number; created_at: string }
			| undefined;
	}

	async markOTPAsVerified(email: string, otp: string) {
		return this.markOTPAsVerifiedPrepare.run({ email, otp }) as RunResult;
	}

	async deletePasswordResetOTPs(email: string) {
		return this.deletePasswordResetOTPsPrepare.run({ email }) as RunResult;
	}

	async updateUserPassword(email: string, password_hash: string) {
		return this.updateUserPasswordPrepare.run({ email, password_hash }) as RunResult;
	}

	// ---------------------- Account Management Methods ----------------------

	async updatePasswordById(userId: number, password_hash: string) {
		return this.updatePasswordByIdPrepare.run({ userId, password_hash }) as RunResult;
	}

	async revokeAllUserRefreshTokens(userId: number) {
		return this.revokeAllUserRefreshTokensPrepare.run({ userId }) as RunResult;
	}

	async deleteUser(userId: number) {
		return this.deleteUserPrepare.run({ userId }) as RunResult;
	}

	async updateEmailById(userId: number, email: string) {
		return this.updateEmailByIdPrepare.run({ userId, email }) as RunResult;
	}
}
