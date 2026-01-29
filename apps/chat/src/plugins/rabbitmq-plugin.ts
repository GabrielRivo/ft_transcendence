import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { RabbitMQClient, RabbitMQServer } from 'my-fastify-decorators-microservices';

declare module 'fastify' {
    interface FastifyInstance {
        mq: RabbitMQClient;
    }
}

async function rabbitmqPlugin(fastify: FastifyInstance) {
    const urls = [process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672'];

    const server = new RabbitMQServer({
        urls,
        queue: 'chat_tournament_sub', // Unique queue name for Chat Service subscription
        exchange: {
            name: "tournament.fanout",
            type: "fanout"
        }
    });

    fastify.ready(async () => {
        try {
            await server.listen();
        } catch (err) { }
    });

    fastify.addHook('onClose', async () => {
        await server.close();
    });
}

export default fp(rabbitmqPlugin);
