import Database from 'better-sqlite3';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fs from 'fs';
import path from 'path';
import config from '../config.js';
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
	// Database file is stored in ./db/ directory (mounted as Docker volume for persistence)
	const dbPath = './db/db.sqlite';
	// Schema SQL file is in ./data/ directory (part of the source code, not overwritten by volume)
	const initSqlPath = './data/init.sql';

	// Ensure the db directory exists
	const dbDir = path.dirname(dbPath);
	if (!fs.existsSync(dbDir)) {
		fs.mkdirSync(dbDir, { recursive: true });
	}

	const db = new Database(dbPath, opts);

	try {
		const initSql = fs.readFileSync(path.join(__dirname, initSqlPath), 'utf8');
		db.exec(initSql);

		if (config.env === 'development') {
			const tables = db
				.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
				.all() as { name: string }[];

			// console.log('\n--- DATABASE VISUALIZER ---');
			tables.forEach((table) => {
				// console.log(`\nTable: ${table.name}`);
				const rows = db.prepare(`SELECT * FROM ${table.name}`).all();
				if (rows.length > 0) {
					console.table(rows);
				} else {
					const columns = db.prepare(`PRAGMA table_info(${table.name})`).all() as {
						name: string;
					}[];
					const emptyRow = columns.reduce((acc, col) => ({ ...acc, [col.name]: '<vide>' }), {});
					console.table([emptyRow]);
					// console.log('(Table vide)');
				}
			});
			// console.log('-------------------------------\n');
		}
	} catch (error) {
		// console.error(error);
		throw error;
	}

	fastify.decorate('db', db);

	fastify.addHook('onClose', (_fastify, done: () => void) => {
		(fastify as any).db.close();
		done();
	});
}

export default fp(dbConnector);
