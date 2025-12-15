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

async function dbConnector(fastify: FastifyInstance) {
	const db = new Database('./data/db.sqlite', opts);

	const initSql = fs.readFileSync(path.join(__dirname, './data/init.sql'), 'utf8');
	db.exec(initSql);

	fastify.decorate('db', db);

	fastify.addHook('onClose', (_fastify, done: () => void) => {
		(fastify as FastifyInstance & { db: Database.Database }).db.close();
		done();
	});
}

export default fp(dbConnector);
