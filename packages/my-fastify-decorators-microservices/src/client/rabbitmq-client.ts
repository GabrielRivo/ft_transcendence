import amqp, { Connection, Channel, Options } from 'amqplib';
import type { ExchangeType } from '../helpers/types.js';

export interface RabbitMQClientOptions {
    urls: string[];
    queue?: string;
    exchange?: {
        name: string;
        /**
         * Type d'exchange:
         * - 'direct': routing exact (par défaut si non spécifié)
         * - 'topic': permet les wildcards (*, #) côté consommateur
         * - 'fanout': broadcast à tous les consommateurs (le pattern est ignoré)
         * - 'headers': rajout plus tard...
         */
        type: ExchangeType;
        options?: Options.AssertExchange;
    };
}

export interface EmitOptions {
    queue?: string;
    /**
     * Routing key pour l'exchange (pour topic/direct exchange)
     * Si non fourni, utilise le pattern comme routing key
     */
    routingKey?: string;
}

export class RabbitMQClient {
    private connection: any = null;
    private channel: Channel | null = null;
    private exchangeAsserted: boolean = false;

    constructor(private options: RabbitMQClientOptions) {}

    async connect() {
        if (!this.connection) {
            this.connection = await amqp.connect(this.options.urls[0]);
            this.channel = await this.connection.createChannel();
            
            if (this.options.exchange && !this.exchangeAsserted) {
                await this.channel?.assertExchange(
                    this.options.exchange.name,
                    this.options.exchange.type,
                    {
                        durable: true,
                        ...this.options.exchange.options,
                    }
                );
                this.exchangeAsserted = true;
            }
        }
    }

    /**
     * Envoie un événement (Fire and Forget)
     * 
     * Comportement selon la configuration:
     * - Sans exchange: envoie directement dans une queue (sendToQueue)
     * - Avec exchange: publie sur l'exchange avec le pattern comme routing key
     * 
     * @param pattern Le nom de l'événement/routing key (ex: 'user.created')
     * @param data Les données à envoyer
     * @param options Options d'envoi (queue cible, routing key personnalisé)
     */
    emit<T = any>(pattern: string, data: T, options?: EmitOptions | string) {
        if (!this.channel) {
            throw new Error('RabbitMQ Client is not connected');
        }

        const message = JSON.stringify({ pattern, data });
        const messageBuffer = Buffer.from(message);

        const emitOptions: EmitOptions = typeof options === 'string' 
            ? { queue: options } 
            : (options || {});

        if (this.options.exchange) {
            const routingKey = emitOptions.routingKey || pattern;
            this.channel.publish(
                this.options.exchange.name,
                routingKey,
                messageBuffer
            );
        } else {
            const targetQueue = emitOptions.queue || this.options.queue;
            if (!targetQueue) {
                throw new Error('No target queue specified for emit');
            }
            this.channel.sendToQueue(targetQueue, messageBuffer);
        }
    }

    /**
     * Publie un message sur un exchange avec un routing key spécifique
     * (Méthode explicite pour la publication sur exchange)
     * 
     * @param routingKey Le routing key (ex: 'user.created', 'order.shipped')
     * @param data Les données à envoyer
     */
    publish<T = any>(routingKey: string, data: T) {
        if (!this.channel) {
            throw new Error('RabbitMQ Client is not connected');
        }

        if (!this.options.exchange) {
            throw new Error('No exchange configured. Use emit() for direct queue messaging or configure an exchange.');
        }

        const message = JSON.stringify({ pattern: routingKey, data });
        this.channel.publish(
            this.options.exchange.name,
            routingKey,
            Buffer.from(message)
        );
    }

    /**
     * Broadcast un message à tous les consommateurs (pour fanout exchange)
     * Le routing key est ignoré avec fanout, mais on l'inclut dans le message pour le filtrage côté handler
     * 
     * @param pattern Le pattern/événement (inclus dans le message pour le filtrage)
     * @param data Les données à envoyer
     */
    broadcast<T = any>(pattern: string, data: T) {
        if (!this.channel) {
            throw new Error('RabbitMQ Client is not connected');
        }

        if (!this.options.exchange) {
            throw new Error('No exchange configured. Configure a fanout or topic exchange for broadcasting.');
        }

        const message = JSON.stringify({ pattern, data });
        this.channel.publish(
            this.options.exchange.name,
            '',
            Buffer.from(message)
        );
    }

    async close() {
        try {
            if (this.channel) await this.channel.close();
            if (this.connection) await this.connection.close();
        } catch (e) { }
    }
}
