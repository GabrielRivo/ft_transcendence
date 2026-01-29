import Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fs from 'fs';
import path from 'path';

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
	const dbPath = options.dbPath || './db/db.sqlite';
	const initSqlPath = options.initSqlPath || './data/init.sql';

	const dbDir = path.dirname(dbPath);
	if (!fs.existsSync(dbDir)) {
		fs.mkdirSync(dbDir, { recursive: true });
	}

	const db = new Database(dbPath);

	const initSql = fs.readFileSync(path.join(__dirname, initSqlPath), 'utf8');
	db.exec(initSql);

	fastify.decorate('db', db);

	fastify.addHook('onClose', (_fastify, done: () => void) => {
		(fastify as FastifyInstance & { db: Database.Database }).db.close();
		done();
	});
}

export default fp(dbConnector);
