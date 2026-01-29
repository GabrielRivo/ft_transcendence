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

    const tournament = new RabbitMQServer({
        urls,
        queue: 'chat_tournament_sub', // Unique queue name for Chat Service subscription
        exchange: {
            name: "tournament.fanout",
            type: "fanout"
        }
    });

    const user = new RabbitMQServer({
        queue: 'chat.user.queue',
        urls,
        exchange: {
            name: 'auth.users.exchange',
            type: 'fanout',
        },
        consumeMode: 'exclusive',
    });

    fastify.ready(async () => {
        try {
            await tournament.listen();
            await user.listen();
        } catch (err) { }
    });

    fastify.addHook('onClose', async () => {
        await tournament.close();
        await user.close();
    });
}

export default fp(rabbitmqPlugin);
