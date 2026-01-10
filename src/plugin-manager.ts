import type { FastifyInstance } from 'fastify';

import socketPlugin from './plugins/socket-plugin.js';
import sqlitePlugin from './plugins/sqlite-plugin.js';

export default function pluginManager(app: FastifyInstance, options: { dbPath?: string } = {}) {
	app.register(sqlitePlugin, { dbPath: options.dbPath });
	app.register(socketPlugin);
	// app.register(jwtPlugin);
}
