import type { FastifyInstance } from 'fastify';

import sqlitePlugin from './plugins/sqlite-plugin.js';
import rabbitmqPlugin from './plugins/rabbitmq-plugin.js';

export default function pluginManager(app: FastifyInstance, options: { dbPath?: string } = {}) {
	app.register(sqlitePlugin, { dbPath: options.dbPath });
	app.register(rabbitmqPlugin)
	// app.register(jwtPlugin);
}
