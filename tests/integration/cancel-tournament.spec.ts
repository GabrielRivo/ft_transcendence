
import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';
import { container } from 'my-fastify-decorators';
import Ajv from 'ajv';
import * as ajvErrors from 'ajv-errors';
import { registerValidators } from 'my-class-validator';
import { CancelTournamentUseCase } from '../../src/tournament/application/use-cases/cancel-tournament.use-case.js';
import { CreateTournamentUseCase } from '../../src/tournament/application/use-cases/create-tournament.use-case.js';
import bootstrapPlugin from '../../src/plugins/bootstrap-plugin.js';
import rabbitmqPlugin from '../../src/plugins/rabbitmq-plugin.js';
import sqlitePlugin from '../../src/plugins/sqlite-plugin.js';
import { RabbitMQClient } from 'rabbitmq-client';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

describe('CancelTournament Integration', () => {
    let app: FastifyInstance;

    let testConsumerClient: RabbitMQClient;
    const receivedEvents: any[] = [];

    beforeAll(async () => {
        const rmqUrl = process.env.RABBITMQ_URI || 'amqp://guest:guest@localhost:5672';
        testConsumerClient = new RabbitMQClient({ url: rmqUrl });
        await testConsumerClient.connect();

        await testConsumerClient.subscribe('test-queue-cancel-' + randomUUID(), ['tournament.#'], async (msg, routingKey) => {
            receivedEvents.push({ routingKey, payload: msg });
        });

        app = Fastify();

        // Mock IO for SocketPublisher
        app.decorate('io', {
            to: () => ({ emit: () => { } }),
            of: () => ({ on: () => { } }),
            emit: () => { }
        });

        // Setup AJV
        const AjvCtor: any = (Ajv as any).default ?? Ajv;
        const addAjvErrors: any = (ajvErrors as any).default ?? ajvErrors;
        const ajv = new AjvCtor({ allErrors: true, $data: true, messages: true, coerceTypes: true } as any);
        addAjvErrors(ajv);
        registerValidators(ajv);
        app.setValidatorCompiler(({ schema }) => ajv.compile(schema as any));

        app.register(sqlitePlugin);
        app.register(rabbitmqPlugin);
        app.register(bootstrapPlugin);

        await app.ready();
    }, 30000);

    afterAll(async () => {
        await app.close();
        await testConsumerClient.close();
    });

    it('should cancel tournament and emit CANCELLED event', async () => {
        const createUseCase = container.resolve(CreateTournamentUseCase);
        const cancelUseCase = container.resolve(CancelTournamentUseCase);

        const ownerId = 'owner-cancel';
        const tournamentId = await createUseCase.execute({
            name: 'Cancel Test Cup',
            size: 4,
            visibility: 'PUBLIC'
        }, ownerId, 'Owner');

        receivedEvents.length = 0;

        await cancelUseCase.execute(tournamentId, ownerId);

        await new Promise(resolve => setTimeout(resolve, 1000));

        const cancelledEvent = receivedEvents.find(e => e.routingKey === 'tournament.cancelled' && e.payload.aggregateId === tournamentId);
        expect(cancelledEvent).toBeDefined();
    });
});
