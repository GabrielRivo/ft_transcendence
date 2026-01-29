import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import multipart from '@fastify/multipart';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function multipartPlugin(fastify: FastifyInstance) {
	await fastify.register(multipart, {
		limits: {
			fileSize: MAX_FILE_SIZE,
			files: 1,
		},
	});
}

export default fp(multipartPlugin);

