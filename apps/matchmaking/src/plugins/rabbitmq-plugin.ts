import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { RabbitMQClient } from 'my-fastify-decorators-microservices';

declare module 'fastify' {
    interface FastifyInstance {
        mq: RabbitMQClient;
    }
}

async function rabbitmqPlugin(fastify: FastifyInstance) {
    const urls = [process.env.RABBITMQ_URL!];

    // Client for publishing game creation events
    const client = new RabbitMQClient({
        urls,
        exchange: {
            name: 'matchmaking.fanout',
            type: 'fanout'
        }
    });

    fastify.decorate('mq', client);

    fastify.ready(async () => {
        try {
            await client.connect();
        } catch (err) {
            fastify.log.error('Failed to connect to RabbitMQ:', err);
        }
    });

    fastify.addHook('onClose', async () => {
        await client.close();
    });
}

export default fp(rabbitmqPlugin);
