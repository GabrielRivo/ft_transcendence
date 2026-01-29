import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { RabbitMQClient, RabbitMQServer } from 'my-fastify-decorators-microservices';

declare module 'fastify' {
    interface FastifyInstance {
        mq: RabbitMQClient;
    }
}

async function rabbitmqPlugin(fastify: FastifyInstance) {
    const urls = [process.env.RABBITMQ_URI!];

    // Client for publishing tournament events
    const client = new RabbitMQClient({
        urls,
        exchange: {
            name: 'tournament.fanout',
            type: 'fanout'
        }
    });

    // Server for subscribing to game events
    const gameEventsSubscriber = new RabbitMQServer({
        urls,
        queue: 'tournament_game_events',
        exchange: {
            name: 'game.fanout',
            type: 'fanout'
        },
        consumeMode: 'shared'
    });

    fastify.decorate('mq', client);

    fastify.ready(async () => {
        try {
            await client.connect();
            await gameEventsSubscriber.listen();
        } catch (err) { }
    });

    fastify.addHook('onClose', async () => {
        await client.close();
        await gameEventsSubscriber.close();
    });
}

export default fp(rabbitmqPlugin);