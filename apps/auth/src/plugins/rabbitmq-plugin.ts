import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { RabbitMQClient } from 'my-fastify-decorators-microservices';

declare module 'fastify' {
    interface FastifyInstance {
        mq: RabbitMQClient;
    }
}

async function rabbitmqPlugin(fastify: FastifyInstance) {
    const urls = [process.env.RABBITMQ_URL!];


    const client = new RabbitMQClient({
        queue: 'auth.mail.queue',
        urls
    });

    const client2 = new RabbitMQClient({
        queue: 'auth.users.queue',
        urls,
        exchange: {
            name: 'auth.users.exchange',
            type: 'fanout',
        },
    });

    // const server = new RabbitMQServer({
    //     urls,
    //     queue: 'auth_queue',
    // });


    fastify.decorate('mq', client);
    fastify.decorate('users', client2);

    fastify.ready(async () => {
        try {
            await client.connect();
            await client2.connect();
            // await server.listen()
        } catch (err) { }
    });

    fastify.addHook('onClose', async () => {
        await client.close();
        await client2.close();
        // await server.close();
    });
}

export default fp(rabbitmqPlugin);