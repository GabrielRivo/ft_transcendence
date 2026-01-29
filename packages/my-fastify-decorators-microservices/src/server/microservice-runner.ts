import { bootstrapStandalone } from 'my-fastify-decorators';
import { RabbitMQServer, RabbitMQOptions } from './rabbitmq-server.js';

export interface WorkerOptions {
    module: any;
    rabbitMQ: RabbitMQOptions;
    globals?: Record<string, any>; // Permet d'utiliser @InjectPlugin
}

export async function createWorker(options: WorkerOptions) {
    await bootstrapStandalone(options.module, options.globals);

    const server = new RabbitMQServer(options.rabbitMQ);

    const close = async () => {
        await server.close();
        process.exit(0);
    };

    process.on('SIGINT', close);
    process.on('SIGTERM', close);

    await server.listen();
}