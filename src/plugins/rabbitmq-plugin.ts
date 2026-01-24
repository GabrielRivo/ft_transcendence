import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import rabbitmqPlugin from 'rabbitmq-client';

export default fp(async (fastify: FastifyInstance) => {
    await fastify.register(rabbitmqPlugin, {
        url: process.env.RABBITMQ_URI || process.env.RABBITMQ_URL || '',
    });
});
