import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { RabbitMQClient } from 'my-fastify-decorators-microservices';

declare module 'fastify' {
    interface FastifyInstance {
        mq: RabbitMQClient;
    }
}

async function rabbitmqPlugin(fastify: FastifyInstance) {
    const urls = [process.env.RABBITMQ_URI!];

    const client = new RabbitMQClient({
        urls,
        exchange: {
            name: "game.fanout",
            type: "fanout"
        }
    });

    fastify.decorate('mq', client);

    fastify.ready(async () => {
        try {
            await client.connect();
        } catch (err) {
            console.error('RabbitMQ connection failed', err);
        }
    });

    fastify.addHook('onClose', async () => {
        await client.close();
    });
}

export default fp(rabbitmqPlugin);
