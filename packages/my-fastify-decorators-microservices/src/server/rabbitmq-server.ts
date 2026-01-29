import amqp from 'amqplib';
import type { Channel, ConsumeMessage, Options } from 'amqplib';
import { container } from 'my-fastify-decorators';
import { MICROSERVICE_METADATA } from '../helpers/metadata.keys.js';
import { MicroserviceParamType, MicroserviceParamDef } from '../decorators/params.decorator.js';
import type { ExchangeType } from '../helpers/types.js';

export interface RabbitMQOptions {
    urls: string[];
    queue: string;
    queueOptions?: Options.AssertQueue;
    exchange?: {
        /**
         * Nom de l'exchange
         */
        name: string;
        /**
         * Type d'exchange:
         * - 'direct': routing exact (par défaut si non spécifié)
         * - 'topic': permet les wildcards (*, #)
         * - 'fanout': broadcast à tous les consommateurs (duplication) 
         * - 'headers': rajout plus tard...
         */
        type: ExchangeType;
        /**
         * Options de l'exchange
         */
        options?: Options.AssertExchange;
    };
    /**
     * Mode de consommation:
     * - 'shared': tous les consommateurs partagent la meme queue (load balancing)
     * - 'exclusive': chaque instance a sa propre queue (broadcast/duplication)
     * 
     * @default 'shared'
     */
    consumeMode?: 'shared' | 'exclusive';
    serviceId?: string;
}

export class RabbitMQServer {
    private connection: any = null;
    private channel: Channel | null = null;
    private actualQueueName: string = '';
    
    private handlers = new Map<string, Function>();
    private patternMatchers: Array<{ pattern: string; regex: RegExp; handler: Function }> = [];

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

            await this.setupQueueAndExchange(channel);

            this.bindEvents();

            await channel.consume(this.actualQueueName, this.handleMessage.bind(this));

        } catch (error) {
            throw error;
        }
    }

    private async setupQueueAndExchange(channel: Channel): Promise<void> {
        const { exchange, consumeMode = 'shared', serviceId } = this.options;

        if (exchange) {
            await channel.assertExchange(exchange.name, exchange.type, {
                durable: true,
                ...exchange.options,
            });

            if (consumeMode === 'exclusive') {
                const uniqueQueueName = serviceId 
                    ? `${this.options.queue}.${serviceId}`
                    : `${this.options.queue}.${this.generateUniqueId()}`;
                
                const queueResult = await channel.assertQueue(uniqueQueueName, {
                    durable: false,
                    exclusive: false, // On peut la rendre exclusive si on veut auto-delete
                    autoDelete: true,
                    ...this.options.queueOptions,
                });
                
                this.actualQueueName = queueResult.queue;
            } else {
                await channel.assertQueue(this.options.queue, {
                    durable: false,
                    ...this.options.queueOptions,
                });
                this.actualQueueName = this.options.queue;
            }


            const bindingKey = exchange.type === 'fanout' ? '' : '#';
            await channel.bindQueue(this.actualQueueName, exchange.name, bindingKey);
        } else {
            await channel.assertQueue(this.options.queue, {
                durable: false,
                ...this.options.queueOptions,
            });
            this.actualQueueName = this.options.queue;
        }
    }

    private generateUniqueId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
                                            pattern,
                                            routingKey: msg.fields?.routingKey,
                                        };
                                        break;
                                }
                            });

                            await instance[methodName](...args);
                            ch.ack(msg);

                        } catch (err) {
                            ch.nack(msg, false, false);
                        }
                    };

                    if (this.isWildcardPattern(pattern)) {
                        const regex = this.patternToRegex(pattern);
                        this.patternMatchers.push({ pattern, regex, handler: handlerWrapper });
                    } else {
                        this.handlers.set(pattern, handlerWrapper);
                    }
                }
            });
        });
    }

    private isWildcardPattern(pattern: string): boolean {
        return pattern.includes('*') || pattern.includes('#');
    }

    /**
     * handle REGEX pattern
     * - '*' : correspond à exactement un mot (entre les points)
     * - '#' : correspond à zéro ou plusieurs mots
     * 
     * Exemples:
     * - 'user.*' -> matche 'user.created', 'user.deleted'
     * - 'user.#' -> matche 'user', 'user.created', 'user.profile.updated'
     * - '*.created' -> matche 'user.created', 'order.created'
     * - '#.error' -> matche 'error', 'system.error', 'app.module.error'
     */
    private patternToRegex(pattern: string): RegExp {
        const escaped = pattern
            .split('.')
            .map(part => {
                if (part === '*') {
                    return '[^.]+';
                } else if (part === '#') {
                    return '.*';
                } else {
                    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                }
            })
            .join('\\.');
        
        let finalPattern = escaped;
        
        if (escaped.startsWith('.*\\.')) {
            finalPattern = escaped.replace(/^\.\*\\\./, '(.*\\.)?');
        }
        
        if (escaped.endsWith('\\..*')) {
            finalPattern = finalPattern.replace(/\\\.\.\*$/, '(\\..*)?');
        }

        if (pattern === '#') {
            return /^.*$/;
        }

        return new RegExp(`^${finalPattern}$`);
    }

    private findMatchingHandlers(incomingPattern: string): Function[] {
        const handlers: Function[] = [];

        if (this.handlers.has(incomingPattern)) {
            handlers.push(this.handlers.get(incomingPattern)!);
        }

        for (const matcher of this.patternMatchers) {
            if (matcher.regex.test(incomingPattern)) {
                handlers.push(matcher.handler);
            }
        }

        return handlers;
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
                channel.nack(msg, false, false);
                return;
            }

            const routingKey = msg.fields?.routingKey;
            const effectivePattern = pattern || routingKey;

            if (effectivePattern) {
                const matchingHandlers = this.findMatchingHandlers(effectivePattern);
                
                if (matchingHandlers.length > 0) {
                    matchingHandlers[0](msg, channel);
                    for (let i = 1; i < matchingHandlers.length; i++) {
                        const clonedMsg = { ...msg, ackOrNack: 'handled' };
                        matchingHandlers[i](clonedMsg as any, channel);
                    }
                } else {
                    channel.ack(msg);
                }
            } else {
                channel.ack(msg);
            }
        } catch (e) {
            channel.nack(msg, false, false);
        }
    }

    async close(): Promise<void> {
        try {
            if (this.channel) await this.channel.close();
            if (this.connection) await this.connection.close();
        } catch (e) { }
    }
}
