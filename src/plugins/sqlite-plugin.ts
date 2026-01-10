import Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fs from 'fs';
import path from 'path';

const opts: Database.Options = {
	// verbose: console.log,
};

declare module 'fastify' {
	interface FastifyInstance {
		db: Database.Database;
	}
}

const __dirname = path.resolve();

async function dbConnector(
	fastify: FastifyInstance,
	options: { dbPath?: string; initSqlPath?: string } = {},
) {
	// Database file is stored in ./db/ directory (mounted as Docker volume for persistence)
	const dbPath = options.dbPath || './db/db.sqlite';
	// Schema SQL file is in ./data/ directory (part of the source code, not overwritten by volume)
	const initSqlPath = options.initSqlPath || './data/init.sql';

	// Ensure the db directory exists
	const dbDir = path.dirname(dbPath);
	if (!fs.existsSync(dbDir)) {
		fs.mkdirSync(dbDir, { recursive: true });
	}

	const db = new Database(dbPath, opts);

	const initSql = fs.readFileSync(path.join(__dirname, initSqlPath), 'utf8');
	db.exec(initSql);

	fastify.decorate('db', db);

	fastify.addHook('onClose', (_fastify, done: () => void) => {
		(fastify as FastifyInstance & { db: Database.Database }).db.close();
		done();
	});
}

export default fp(dbConnector);
