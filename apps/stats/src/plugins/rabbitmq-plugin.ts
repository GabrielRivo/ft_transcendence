import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { RabbitMQServer } from 'my-fastify-decorators-microservices';

declare module 'fastify' {
    interface FastifyInstance {
        mq: RabbitMQServer;
    }
}

async function rabbitmqPlugin(fastify: FastifyInstance) {
    const urls = [process.env.RABBITMQ_URL!];


    // const client = new RabbitMQServer()

    const server = new RabbitMQServer({
        queue: 'stats-game.queue',
        urls,
		exchange : {
			name : 'game.fanout',
			type : 'fanout'
		}
    });

	  const server2 = new RabbitMQServer({
        queue: 'stats-users.queue',
        urls,
		exchange : {
			name : 'auth.users.exchange',
			type : 'fanout'
		}
    });


    // fastify.decorate('mq', server);
    // fastify.decorate('users', client2);

    fastify.ready(async () => {
        try {
            // await client.connect();
            // await client2.connect();
            await server.listen()
			await server2.listen()
        } catch (err) {
            console.error('RabbitMQ connection failed', err);
        }
    });

    fastify.addHook('onClose', async () => {
        // await client.close();
        // await client2.close();
        await server.close();
    });
}

export default fp(rabbitmqPlugin);