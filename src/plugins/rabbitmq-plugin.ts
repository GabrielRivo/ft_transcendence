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


    const client = new RabbitMQClient({
        urls,
        queue: 'mail_queue'
    });


    // const server = new RabbitMQServer({
    //     urls,
    //     queue: 'auth_queue',
    // });


    fastify.decorate('mq', client);


    fastify.ready(async () => {
        try {
            await client.connect();
            // await server.listen()
        } catch (err) {
            console.error('RabbitMQ connection failed', err);
        }
    });

    fastify.addHook('onClose', async () => {
        await client.close();
        // await server.close();
    });
}

export default fp(rabbitmqPlugin);