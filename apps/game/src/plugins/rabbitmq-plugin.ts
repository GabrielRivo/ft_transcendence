import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import { RabbitMQClient, RabbitMQServer } from 'my-fastify-decorators-microservices';

declare module 'fastify' {
    interface FastifyInstance {
        mq: RabbitMQClient;
        gameCreationServer: RabbitMQServer;
    }
}

async function rabbitmqPlugin(fastify: FastifyInstance) {
    const urls = [process.env.RABBITMQ_URI!];

    // Client for publishing game events
    const client = new RabbitMQClient({
        urls,
        exchange: {
            name: "game.fanout",
            type: "fanout"
        }
    });

    // Server for receiving game creation requests from matchmaking/tournament
    const gameCreationServer = new RabbitMQServer({
        urls,
        queue: 'game_creation_queue',
        exchange: {
            name: 'matchmaking.fanout',
            type: 'fanout'
        },
        consumeMode: 'shared'
    });

    fastify.decorate('mq', client);
    fastify.decorate('gameCreationServer', gameCreationServer);

    fastify.ready(async () => {
        try {
            await client.connect();
            await gameCreationServer.listen();
        } catch { }
    });

    fastify.addHook('onClose', async () => {
        await client.close();
        await gameCreationServer.close();
    });
}

export default fp(rabbitmqPlugin);
