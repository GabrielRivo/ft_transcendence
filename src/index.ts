import { createWorker } from 'my-fastify-decorators-microservices';
import { AppModule } from './app.module.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

createWorker({
    module: AppModule,
    rabbitMQ: {
        urls: [process.env.RABBITMQ_URL!],
        queue: 'mail_queue',
    },
    globals: {
		resend,
        // Si tu utilises @InjectPlugin('db'), tu peux passer l'objet ici
    }
}).catch((err: any) => {
    console.error(err);
    process.exit(1);
});