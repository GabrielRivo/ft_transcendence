import type { MultipartFile } from '@fastify/multipart';
import Database, { Statement } from 'better-sqlite3';
import { BadRequestException, InjectPlugin, NotFoundException, Service } from 'my-fastify-decorators';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ReadProfileDtoResponse } from './dto/readProfile.dto.js';

const IMAGES_DIR = './images';
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const GetProfile = `SELECT userId, username, bio, avatar, avatar_provider, self_hosted FROM profiles WHERE userId = ?`;
// const GetProfileByUsername = `SELECT userId, username, bio, avatar, avatar_provider, self_hosted FROM profiles WHERE username = ?`;
const CreateProfile = `INSERT INTO profiles (userId, username, bio, avatar, avatar_provider, self_hosted) VALUES (?, '', '', NULL, NULL, 0)`;
const CreateProfileWithAvatar = `INSERT INTO profiles (userId, username, bio, avatar, avatar_provider, self_hosted) VALUES (?, '', '', ?, ?, 0)`;
const UpdateBio = `UPDATE profiles SET bio = ?, updated_at = CURRENT_TIMESTAMP WHERE userId = ?`;
const UpdateAvatar = `UPDATE profiles SET avatar = ?, self_hosted = ?, updated_at = CURRENT_TIMESTAMP WHERE userId = ?`;
const UpdateAvatarProvider = `UPDATE profiles SET avatar_provider = ?, updated_at = CURRENT_TIMESTAMP WHERE userId = ?`;
const UpdateUsername = `UPDATE profiles SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE userId = ?`;
const DeleteProfile = `DELETE FROM profiles WHERE userId = ?`;
const GetAvatarInfo = `SELECT avatar, avatar_provider, self_hosted FROM profiles WHERE userId = ?`;

interface ProfileRow {
	userId: number;
	username: string;
	bio: string;
	avatar: string | null;
	avatar_provider: string | null;
	self_hosted: number;
}

interface AvatarInfoRow {
	avatar: string | null;
	avatar_provider: string | null;
	self_hosted: number;
}

@Service()
export class UserService {
	@InjectPlugin('db')
	private db!: Database.Database;

	private stmtGetProfile!: Statement;
	// private stmtGetProfileByUsername!: Statement;
	private stmtCreateProfile!: Statement;
	private stmtCreateProfileWithAvatar!: Statement;
	private stmtUpdateBio!: Statement;
	private stmtUpdateAvatar!: Statement;
	private stmtUpdateAvatarProvider!: Statement;
	private stmtUpdateUsername!: Statement;
	private stmtDeleteProfile!: Statement;
	private stmtGetAvatarInfo!: Statement;

	onModuleInit() {
		if (!fs.existsSync(IMAGES_DIR)) {
			fs.mkdirSync(IMAGES_DIR, { recursive: true });
		}

		this.stmtGetProfile = this.db.prepare(GetProfile);
		// this.stmtGetProfileByUsername = this.db.prepare(GetProfileByUsername);
		this.stmtCreateProfile = this.db.prepare(CreateProfile);
		this.stmtCreateProfileWithAvatar = this.db.prepare(CreateProfileWithAvatar);
		this.stmtUpdateBio = this.db.prepare(UpdateBio);
		this.stmtUpdateAvatar = this.db.prepare(UpdateAvatar);
		this.stmtUpdateAvatarProvider = this.db.prepare(UpdateAvatarProvider);
		this.stmtUpdateUsername = this.db.prepare(UpdateUsername);
		this.stmtDeleteProfile = this.db.prepare(DeleteProfile);
		this.stmtGetAvatarInfo = this.db.prepare(GetAvatarInfo);
	}

	// private getOrCreateProfile(userId: number): ProfileRow {
	// 	let profile = this.stmtGetProfile.get(userId) as ProfileRow | undefined;

	// 	// if (!profile) {
	// 	// 	this.stmtCreateProfile.run(userId);
	// 	// 	profile = this.stmtGetProfile.get(userId) as ProfileRow;
	// 	// }

	// 	return profile;
	// }

	async get_profile(userIdOrUsername: number): Promise<ReadProfileDtoResponse> {
		let profile: ProfileRow | undefined;

		// Check if the input string contains only digits to consider it as an ID

		profile = this.stmtGetProfile.get(userIdOrUsername) as ProfileRow | undefined;
		if (!profile) {
			throw new NotFoundException('User not found');
		}

		return {
			id: profile.userId,
			username: profile.username,
			avatar: profile.avatar,
			bio: profile.bio,
		};
	}

	async update_bio(userId: number, bio: string): Promise<{ message: string }> {
		// this.getOrCreateProfile(userId);
		this.stmtUpdateBio.run(bio, userId);
		return { message: 'Bio updated successfully' };
	}

	async update_profile(userId: string, data: { bio: string }): Promise<{ message: string }> {
		const userIdNum = parseInt(userId, 10);
		if (isNaN(userIdNum)) {
			throw new BadRequestException('Invalid userId');
		}

		// this.getOrCreateProfile(userIdNum);

		this.stmtUpdateBio.run(data.bio, userIdNum);

		return { message: 'Profile updated successfully' };
	}

	async upload_avatar(userId: number, file: MultipartFile): Promise<{ message: string; avatarUrl: string | null }> {
		if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
			throw new BadRequestException(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
		}

		// this.getOrCreateProfile(userId);

		const avatarInfo = this.stmtGetAvatarInfo.get(userId) as AvatarInfoRow | undefined;

		if (avatarInfo?.self_hosted && avatarInfo.avatar) {
			const oldFilename = avatarInfo.avatar.split('/').pop();
			if (oldFilename) {
				const oldPath = path.join(IMAGES_DIR, oldFilename);
				if (fs.existsSync(oldPath)) {
					fs.unlinkSync(oldPath);
				}
			}
		}

		const extension = this.getExtensionFromMimeType(file.mimetype);
		const filename = `${randomUUID()}.${extension}`;
		const filepath = path.join(IMAGES_DIR, filename);

		const buffer = await file.toBuffer();

		if (buffer.length > MAX_FILE_SIZE) {
			throw new BadRequestException('File too large. Maximum size is 5MB');
		}

		if (!this.isValidImageBuffer(buffer, file.mimetype)) {
			throw new BadRequestException('Invalid image file');
		}

		fs.writeFileSync(filepath, buffer);

		const avatarUrl = `/api/images/${filename}`;
		this.stmtUpdateAvatar.run(avatarUrl, 1, userId);

		return { message: 'Avatar uploaded successfully', avatarUrl };
	}

	async delete_avatar(userId: number): Promise<{ message: string; avatarUrl: string | null }> {
		const avatarInfo = this.stmtGetAvatarInfo.get(userId) as AvatarInfoRow | undefined;

		if (!avatarInfo) {
			throw new NotFoundException('Profile not found');
		}

		if (avatarInfo.self_hosted && avatarInfo.avatar) {
			const filename = avatarInfo.avatar.split('/').pop();
			if (filename) {
				const filepath = path.join(IMAGES_DIR, filename);
				if (fs.existsSync(filepath)) {
					fs.unlinkSync(filepath);
				}
			}
		}

		const newAvatarUrl = avatarInfo.avatar_provider || null;
		this.stmtUpdateAvatar.run(newAvatarUrl, 0, userId);

		return {
			message: 'Avatar deleted successfully',
			avatarUrl: newAvatarUrl
		};
	}

	async update_avatar_provider(userId: number, avatarProviderUrl: string | null): Promise<void> {
		// this.getOrCreateProfile(userId);
		this.stmtUpdateAvatarProvider.run(avatarProviderUrl, userId);

		const avatarInfo = this.stmtGetAvatarInfo.get(userId) as AvatarInfoRow | undefined;
		if (avatarInfo && !avatarInfo.self_hosted) {
			this.stmtUpdateAvatar.run(avatarProviderUrl, 0, userId);
		}
	}


	initProfile(userId: number, avatarProviderUrl?: string | null): void {
		const existingProfile = this.stmtGetProfile.get(userId) as ProfileRow | undefined;

		if (existingProfile) {
			if (avatarProviderUrl) {
				this.stmtUpdateAvatarProvider.run(avatarProviderUrl, userId);
				this.stmtUpdateAvatar.run(avatarProviderUrl, 0, userId);
			}
			return;
		}

		if (avatarProviderUrl) {
			this.stmtCreateProfileWithAvatar.run(userId, avatarProviderUrl, avatarProviderUrl);
		} else {
			this.stmtCreateProfile.run(userId);
		}

		console.log(`[UserService] Profile initialized for user ${userId}`);
	}

	updateUsername(userId: number, username: string): void {
		// this.getOrCreateProfile(userId);
		this.stmtUpdateUsername.run(username, userId);
		console.log(`[UserService] Username updated for user ${userId}: ${username}`);
	}

	deleteProfile(userId: number): void {
		const avatarInfo = this.stmtGetAvatarInfo.get(userId) as AvatarInfoRow | undefined;

		if (avatarInfo?.self_hosted && avatarInfo.avatar) {
			const filename = avatarInfo.avatar.split('/').pop();
			if (filename) {
				const filepath = path.join(IMAGES_DIR, filename);
				if (fs.existsSync(filepath)) {
					fs.unlinkSync(filepath);
					console.log(`[UserService] Deleted avatar file: ${filepath}`);
				}
			}
		}

		this.stmtDeleteProfile.run(userId);
		console.log(`[UserService] Profile deleted for user ${userId}`);
	}

	private getExtensionFromMimeType(mimeType: string): string {
		const map: Record<string, string> = {
			'image/jpeg': 'jpg',
			'image/png': 'png',
			'image/gif': 'gif',
			'image/webp': 'webp',
		};
		return map[mimeType] || 'jpg';
	}

	private isValidImageBuffer(buffer: Buffer, mimeType: string): boolean {
		if (buffer.length < 8) return false;

		switch (mimeType) {
			case 'image/jpeg':
				// JPEG starts with FF D8 FF
				return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;

			case 'image/png':
				// PNG starts with 89 50 4E 47 0D 0A 1A 0A
				return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;

			case 'image/gif':
				// GIF starts with GIF87a or GIF89a
				return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;

			case 'image/webp':
				// WebP starts with RIFF....WEBP
				return buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
					   buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;

			default:
				return false;
		}
	}
}
