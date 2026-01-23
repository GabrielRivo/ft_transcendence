import amqp, { Connection, Channel } from 'amqplib';

export interface RabbitMQClientOptions {
    urls: string[];
    queue?: string; 
}

export class RabbitMQClient {
    private connection: any = null;
    private channel: Channel | null = null;

    constructor(private options: RabbitMQClientOptions) {}

    async connect() {
        if (!this.connection) {
            this.connection = await amqp.connect(this.options.urls[0]);
            this.channel = await this.connection.createChannel();
            console.log('[Microservice] Producer Client connected');
        }
    }

    /**
     * Envoie un événement (Fire and Forget)
     * @param pattern Le nom de l'événement (ex: 'user_created')
     * @param data Les données à envoyer
     * @param queue (Optionnel) La file cible. Si vide, utilise la defaultQueue des options
     */
    emit<T = any>(pattern: string, data: T, queue?: string) {
        if (!this.channel) {
            throw new Error('RabbitMQ Client is not connected');
        }

        const targetQueue = queue || this.options.queue;
        if (!targetQueue) {
            throw new Error('No target queue specified for emit');
        }

        const message = JSON.stringify({ pattern, data });

        this.channel.sendToQueue(targetQueue, Buffer.from(message));
    }

    async close() {
        try {
            if (this.channel) await this.channel.close();
            if (this.connection) await this.connection.close();
        } catch (e) {
            console.warn('[Microservice] Error while closing client', e);
        }
    }
}