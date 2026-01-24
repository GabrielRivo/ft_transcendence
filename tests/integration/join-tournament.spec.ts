
import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import Fastify, { FastifyInstance } from 'fastify';
import { container } from 'my-fastify-decorators';
import Ajv from 'ajv';
import * as ajvErrors from 'ajv-errors';
import { registerValidators } from 'my-class-validator';
import { JoinTournamentUseCase } from '../../src/tournament/application/use-cases/join-tournament.use-case.js';
import { CreateTournamentUseCase } from '../../src/tournament/application/use-cases/create-tournament.use-case.js';
import bootstrapPlugin from '../../src/plugins/bootstrap-plugin.js';
import rabbitmqPlugin from '../../src/plugins/rabbitmq-plugin.js';
import sqlitePlugin from '../../src/plugins/sqlite-plugin.js';
import { RabbitMQClient } from 'rabbitmq-client';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

describe('JoinTournament Integration', () => {
    let app: FastifyInstance;

    let testConsumerClient: RabbitMQClient;
    const receivedEvents: any[] = [];

    beforeAll(async () => {
        const rmqUrl = process.env.RABBITMQ_URI || 'amqp://guest:guest@localhost:5672';
        testConsumerClient = new RabbitMQClient({ url: rmqUrl });
        await testConsumerClient.connect();

        await testConsumerClient.subscribe('test-queue-join-' + randomUUID(), ['tournament.#'], async (msg, routingKey) => {
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

    it('should allow player to join and emit PLAYER_JOINED event', async () => {
        const createUseCase = container.resolve(CreateTournamentUseCase);
        const joinUseCase = container.resolve(JoinTournamentUseCase);

        const ownerId = 'owner-1';
        const tournamentId = await createUseCase.execute({
            name: 'Join Test Cup',
            size: 4,
            visibility: 'PUBLIC'
        }, ownerId, 'Owner');

        // Clear events from creation
        receivedEvents.length = 0;

        const newPlayerId = 'player-2';
        await joinUseCase.execute(tournamentId, { displayName: 'PlayerTwo' }, newPlayerId, false);

        await new Promise(resolve => setTimeout(resolve, 1000));

        const joinedEvent = receivedEvents.find(e => e.routingKey === 'tournament.player_joined' && e.payload.aggregateId === tournamentId && e.payload.playerId === newPlayerId);
        expect(joinedEvent).toBeDefined();
    });

    it('should start tournament when full and emit STARTED event', async () => {
        const createUseCase = container.resolve(CreateTournamentUseCase);
        const joinUseCase = container.resolve(JoinTournamentUseCase);

        const ownerId = 'owner-start';
        // Size 2 for quick start
        const tournamentId = await createUseCase.execute({
            name: 'Quick Start Cup',
            size: 4, // Tournament sizes are fixed to 4, 8, 16
            visibility: 'PUBLIC'
        }, ownerId, 'Owner');

        receivedEvents.length = 0;

        // Add 3 more players to reach 4
        await joinUseCase.execute(tournamentId, { displayName: 'P2' }, 'p2', false);
        await joinUseCase.execute(tournamentId, { displayName: 'P3' }, 'p3', false);
        await joinUseCase.execute(tournamentId, { displayName: 'P4' }, 'p4', false);

        await new Promise(resolve => setTimeout(resolve, 1000));

        const startedEvent = receivedEvents.find(e => e.routingKey === 'tournament.started' && e.payload.aggregateId === tournamentId);
        expect(startedEvent).toBeDefined();
    });
});
