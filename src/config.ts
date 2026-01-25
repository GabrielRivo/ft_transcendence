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
