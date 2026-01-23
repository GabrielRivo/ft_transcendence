import amqp from 'amqplib';
import type { Channel, ConsumeMessage, Options } from 'amqplib';
import { container } from 'my-fastify-decorators';
import { MICROSERVICE_METADATA } from '../helpers/metadata.keys.js';
import { MicroserviceParamType, MicroserviceParamDef } from '../decorators/params.decorator.js';

export interface RabbitMQOptions {
    urls: string[];
    queue: string;
    queueOptions?: Options.AssertQueue;
}

export class RabbitMQServer {
    private connection: any = null;
    private channel: Channel | null = null;
    
    private handlers = new Map<string, Function>();

        constructor(private options: RabbitMQOptions) {}

    async listen(): Promise<void> {
        if (!this.options.urls || this.options.urls.length === 0) {
            throw new Error('RabbitMQ URLs are missing');
        }

        try {
            const connection = await amqp.connect(this.options.urls[0]);
            this.connection = connection;

            const channel: Channel = await connection.createChannel();
            this.channel = channel;

            await channel.assertQueue(this.options.queue, {
                durable: false,
                ...this.options.queueOptions,
            });

            console.log(`[Microservice] Connected to RabbitMQ queue: "${this.options.queue}"`);

            this.bindEvents();

            await channel.consume(this.options.queue, this.handleMessage.bind(this));

        } catch (error) {
            console.error('[Microservice] Connection error:', error);
            throw error;
        }
    }

    private bindEvents(): void {
        const instances = container.getAllInstances();

        instances.forEach((instance) => {
            if (!instance) return;

            const prototype = Object.getPrototypeOf(instance);
            const methods = Object.getOwnPropertyNames(prototype);

            methods.forEach((methodName) => {
                const pattern = Reflect.getMetadata(MICROSERVICE_METADATA.eventPattern, prototype, methodName);
                
                if (pattern) {
                    console.log(`[Microservice] Mapped event "${pattern}" to ${instance.constructor.name}.${methodName}`);
                    
                    const handlerWrapper = async (msg: ConsumeMessage | null, ch: Channel) => {
                        if (!msg) return;

                        let content: any = {};
                        try {
                            const rawContent = msg.content.toString();
                            try {
                                content = JSON.parse(rawContent);
                            } catch {
                                content = rawContent;
                            }

                            const params: MicroserviceParamDef[] = Reflect.getOwnMetadata(MICROSERVICE_METADATA.params, prototype, methodName) || [];
                            const args = new Array(params.length);
                            
                            params.sort((a, b) => a.index - b.index).forEach(param => {
                                switch(param.type) {
                                    case MicroserviceParamType.PAYLOAD:
                                        args[param.index] = (content && content.data) ? content.data : content;
                                        break;
                                    case MicroserviceParamType.CONTEXT:
                                        args[param.index] = {
                                            channel: ch,
                                            originalMessage: msg,
                                            pattern
                                        };
                                        break;
                                }
                            });

                            await instance[methodName](...args);
                            ch.ack(msg);

                        } catch (err) {
                            console.error(`Error handling pattern ${pattern}:`, err);
                            ch.nack(msg, false, false);
                        }
                    };

                    this.handlers.set(pattern, handlerWrapper);
                }
            });
        });
    }

    private handleMessage(msg: ConsumeMessage | null): void {
        if (!msg) return;
        
        const channel = this.channel;
        if (!channel) return;

        try {
            let pattern: string | undefined;
            
            try {
                const content = JSON.parse(msg.content.toString());
                pattern = content.pattern || content.event;
            } catch {
                console.warn('[Microservice] No-JSON message received');
                channel.nack(msg, false, false);
                return;
            }

            if (pattern && this.handlers.has(pattern)) {
                const handler = this.handlers.get(pattern)!;
                handler(msg, channel);
            } else {
                channel.ack(msg);
            }
        } catch (e) {
            console.error('[Microservice] Router error', e);
            channel.nack(msg, false, false);
        }
    }

    async close(): Promise<void> {
        try {
            if (this.channel) await this.channel.close();
            if (this.connection) await this.connection.close();
        } catch (e) {
            console.warn('[Microservice] Error while closing connection', e);
        }
    }
}