import dotenv from 'dotenv';

dotenv.config();

export interface Config {
	accessTokenName: string;
	jwt: {
		secret: string;
	};
	db: {
		path: string;
		initSqlPath: string;
	};
	gameServiceUrl: string;
	rabbitmqUri: string;
}

function loadConfiguration(): Readonly<Config> {
	const errors: string[] = [];

	const readEnv = (
		key: string,
		options: { required?: boolean; validate?: (value: string) => boolean; errorMessage?: string } = {},
	): string | undefined => {
		const raw = process.env[key];
		const value = raw?.trim();

		if (!value) {
			if (options.required) {
				errors.push(`Missing required environment variable: ${key}`);
			}
			return undefined;
		}

		if (options.validate && !options.validate(value)) {
			errors.push(options.errorMessage ?? `Invalid value for environment variable: ${key}`);
		}

		return value;
	};

	// const accessTokenName = readEnv('ACCESS_TOKEN_NAME', { required: true });
	// const jwtSecret = readEnv('JWT_SECRET', { required: true });
	// const gameServiceUrl = readEnv('GAME_SERVICE_URL', {
	// 	required: true,
	// 	validate: (value) => {
	// 		try {
	// 			new URL(value);
	// 			return true;
	// 		} catch {
	// 			return false;
	// 		}
	// 	},
	// 	errorMessage: 'GAME_SERVICE_URL must be a valid URL',
	// });
	// const dbPath = readEnv('DB_PATH', { required: true });
	// const initSqlPath = readEnv('INIT_SQL_PATH', { required: true });
	// const rabbitmqUri = readEnv('RABBITMQ_URI', { required: true });

	// if (errors.length > 0) {
	// 	throw new Error(`Configuration validation failed:\n- ${errors.join('\n- ')}`);
	// }

	const config: Config = {
		accessTokenName: "access_token" as string,
		jwt: {
			secret: "dev-secret-change-in-production" as string,
		},
		db: {
			path: "db/tournament.db" as string,
			initSqlPath: "data/init.sql" as string,
		},
		gameServiceUrl: "http://game:3000" as string,
		rabbitmqUri: "amqp://guest:guest@rabbitmq:5672" as string,
	};

	return Object.freeze(config);
}

export const loadConfig = loadConfiguration;

const config = loadConfiguration();

export default config;
