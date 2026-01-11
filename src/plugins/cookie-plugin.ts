import cookie from '@fastify/cookie';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

async function cookiePlugin(fastify: FastifyInstance) {
	fastify.register(cookie, {
		secret: process.env.COOKIE_SECRET || 'cookie-secret-change-in-production',
		parseOptions: {},
	});
}

export default fp(cookiePlugin);

