import config from '../config.js';

export type ProviderBasic = 'discord';

export type ProviderKeys = 'github' | ProviderBasic;

type ProviderBase = {
	accessTokenUrl: string;
	userInfoUrl: string;
	body: Record<string, string>;
};

type DiscordProvider = ProviderBase & {
	id: 'discord';
	basic: string;
	contentType: string;
};

type DefaultProvider = ProviderBase & {
	id: Exclude<ProviderKeys, 'discord'>;
};

type Provider = DiscordProvider | DefaultProvider;

export type Providers = Record<ProviderKeys, Provider>;

export const providers = {
	github: {
		authorizationUrl: `https://github.com/login/oauth/authorize?client_id=${config.github.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri + '/api/auth/github/callback')}`,
		accessTokenUrl: 'https://github.com/login/oauth/access_token',
		userInfoUrl: 'https://api.github.com/user',
		contentType: 'application/json',
		body: {
			client_id: config.github.clientId,
			client_secret: config.github.clientSecret,
			scope: 'user:read',
		},
		id: 'github',
	},
	discord: {
		authorizationUrl: `https://discord.com/oauth2/authorize?client_id=${config.discord.clientId}&response_type=code&redirect_uri=${encodeURIComponent(config.redirectUri + '/api/auth/discord/callback')}&scope=identify+email`,
		accessTokenUrl: 'https://discord.com/api/oauth2/token',
		userInfoUrl: 'https://discord.com/api/users/@me',
		contentType: 'application/x-www-form-urlencoded',
		basic:
			'Basic ' +
			Buffer.from(`${config.discord.clientId}:${config.discord.clientSecret}`).toString('base64'),
		body: {
			grant_type: 'authorization_code',
		},
		id: 'discord',
	},
	// google: {
	//     authorizationUrl: `https://accounts.google.com/o/oauth2/auth?client_id=${config.google.clientId}&redirect_uri=${config.redirectUri}`,
	//     accessTokenUrl: 'https://oauth2.googleapis.com/token',
	//     userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
	//     body: {
	//         client_id: config.google.clientId,
	//         client_secret: config.google.clientSecret,
	//         scope: 'email profile'
	//     },
	//     id: "google",
	// }
};

// sample github auth Redirect URI : https://github.com/login/oauth/authorize?client_id=Ov23liGNZRbnN4unSVno&redirect_uri=https://localhost:3000/auth/github/callback
