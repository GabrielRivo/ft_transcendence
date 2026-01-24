
import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';
import { container } from 'my-fastify-decorators';
import Ajv from 'ajv';
import * as ajvErrors from 'ajv-errors';
import { registerValidators } from 'my-class-validator';
import { CreateTournamentUseCase } from '../../src/tournament/application/use-cases/create-tournament.use-case.js';
import bootstrapPlugin from '../../src/plugins/bootstrap-plugin.js';
import rabbitmqPlugin from '../../src/plugins/rabbitmq-plugin.js';
import sqlitePlugin from '../../src/plugins/sqlite-plugin.js';
import { RabbitMQClient } from 'rabbitmq-client';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

describe('CreateTournament Integration', () => {
    let app: FastifyInstance;

    let testConsumerClient: RabbitMQClient;
    const receivedEvents: any[] = [];

    beforeAll(async () => {
        // Initialize independent consumer to verify messages
        const rmqUrl = process.env.RABBITMQ_URI || 'amqp://guest:guest@localhost:5672';
        testConsumerClient = new RabbitMQClient({ url: rmqUrl });
        await testConsumerClient.connect();

        await testConsumerClient.subscribe('test-queue-' + randomUUID(), ['tournament.#'], async (msg, routingKey) => {
            receivedEvents.push({ routingKey, payload: msg });
        });

        // Initialize App
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

        app.register(sqlitePlugin); // Needs DB for repo
        app.register(rabbitmqPlugin);
        app.register(bootstrapPlugin);

        await app.ready();
    }, 30000);

    afterAll(async () => {
        await app.close();
        await testConsumerClient.close();
    });

    it('should create a tournament and publish events', async () => {
        const createTournamentUseCase = container.resolve(CreateTournamentUseCase);

        const ownerId = 'user-123';
        const ownerName = 'TestUser';
        const tournamentName = 'Integration Cup';

        const tournamentId = await createTournamentUseCase.execute({
            name: tournamentName,
            size: 4,
            visibility: 'PUBLIC'
        }, ownerId, ownerName);

        expect(tournamentId).toBeDefined();

        // Wait for events to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify CREATED event
        const createdEvent = receivedEvents.find(e => e.routingKey === 'tournament.created' && e.payload.aggregateId === tournamentId);
        expect(createdEvent).toBeDefined();

        // Verify PLAYER_JOINED event
        const joinedEvent = receivedEvents.find(e => e.routingKey === 'tournament.player_joined' && e.payload.aggregateId === tournamentId);
        expect(joinedEvent).toBeDefined();
        expect(joinedEvent.payload.playerId).toBe(ownerId);
    });
});
