import dotenv from 'dotenv';
dotenv.config();

// if (!process.env.GITHUB_CLIENT_ID) throw new Error('GITHUB_CLIENT_ID is not set');
// if (!process.env.GITHUB_CLIENT_SECRET) throw new Error('GITHUB_CLIENT_SECRET is not set');

// WARNING: Changer pour les providers

const isProduction = process.env.NODE_ENV === 'production';

const config = {
	jwt: {
		secret: process.env.JWT_SECRET || 'supersecretkeychangeit',
		expiresIn: '15m',
		refreshTokenExpiresIn: '7d',
		refreshTokenRotation: 7 * 24 * 60 * 60 * 1000,
		accessTokenMaxAge: 15 * 60 * 1000, // 15 minutes in ms
		refreshTokenMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
	},
	cookie: {
		httpOnly: true,
		secure: isProduction,
		sameSite: 'strict' as const,
		path: '/',
	},
	github: {
		clientId: process.env.GITHUB_CLIENT_ID || '1234567890',
		clientSecret: process.env.GITHUB_CLIENT_SECRET || '1234567890',
	},
	discord: {
		clientId: process.env.DISCORD_CLIENT_ID || '1234567890',
		clientSecret: process.env.DISCORD_CLIENT_SECRET || '1234567890',
	},
	crypto: {
		pepper: process.env.PEPPER || 'c3VwZXJzZWNyZXRwZXBwZXI=',
		keyLength: 64,
		saltLength: 16,
	},
	redirectUri: 'http://localhost:8080',
};

export default config;
