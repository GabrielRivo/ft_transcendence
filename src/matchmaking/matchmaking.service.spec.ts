import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, afterEach, jest } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';
import { bootstrap } from 'my-fastify-decorators';
import { io as Client, type Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { AddressInfo } from 'net';

// Import plugins
import socketPlugin from '../plugins/socket-plugin.js';
import sqlitePlugin from '../plugins/sqlite-plugin.js'; // <--- AJOUT 1 : Import

import { MatchmakingModule } from './matchmaking.module.js';
import { UserService } from './user.service.js';

const TEST_SECRET = 'super-secret-test-key';

describe('Matchmaking Integration Test Suite', () => {
  let app: FastifyInstance;
  let serverPort: number;
  let serverUrl: string;
  let activeClients: ClientSocket[] = [];

  // Mock du UserService pour contrôler les Elos retournés
  const getUserEloSpy = jest.spyOn(UserService.prototype, 'getUserElo');

  // Helper pour générer des tokens valides
  const createToken = (userId: string, email: string = 'test@example.com') => {
    return jwt.sign({ sub: userId, email }, TEST_SECRET);
  };

  // Helper pour connecter un client Socket.IO
  const connectClient = (token: string): ClientSocket => {
    const socket = Client(serverUrl, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
      autoConnect: true,
    });
    activeClients.push(socket);
    return socket;
  };

  beforeAll(async () => {
    console.debug('[TEST] [Setup] Initializing Fastify server...');

    app = Fastify({ logger: true });

    await app.register(sqlitePlugin); 
    await app.register(socketPlugin);
    await app.after();

    // Simulation du middleware d'authentification JWT
    app.decorateRequest('user', null);
    app.addHook('preValidation', async (req) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          (req as any).user = jwt.verify(token, TEST_SECRET);
        } catch (e) { }
      }
    });

    await bootstrap(app, MatchmakingModule);

    await app.ready();
    await app.listen({ port: 0, host: '127.0.0.1' });

    const address = app.server.address() as AddressInfo;
    serverPort = address.port;
    serverUrl = `http://127.0.0.1:${serverPort}`;

    console.debug(`[TEST] [Setup] Server listening on ${serverUrl}`);
  });

  afterEach(() => {
    // Nettoyage des clients après chaque test
    activeClients.forEach((socket) => {
      if (socket.connected) socket.disconnect();
    });
    activeClients = [];
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  // ===========================================================================
  // TESTS BASIQUES (Sanity Check)
  // ===========================================================================

  it('should return 200 OK on /matchmaking/health', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/matchmaking/health',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('ok');
  });

  it('should allow a user to connect and join the queue', (done) => {
    const userId = 'user-basic';
    const userElo = 1500;
    getUserEloSpy.mockResolvedValue(userElo);

    const socket = connectClient(createToken(userId));

    socket.on('connect', () => {
      socket.emit('join_queue', { elo: userElo });
    });

    socket.on('queue_joined', (data) => {
      try {
        expect(data.userId).toBe(userId);
        expect(data.elo).toBe(userElo);
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  // ===========================================================================
  // TESTS AVANCÉS (Ready Check & Algorithme)
  // ===========================================================================

  it('should handle decline scenario: P1 re-queued (priority), P2 penalized', (done) => {
    const p1Id = 'player-good'; // Celui qui accepte
    const p2Id = 'player-bad';  // Celui qui refuse
    const elo = 1200;

    getUserEloSpy.mockResolvedValue(elo);

    const client1 = connectClient(createToken(p1Id));
    const client2 = connectClient(createToken(p2Id));

    let stepsCompleted = 0;
    const checkDone = () => {
      stepsCompleted++;
      // On attend 3 validations : Cancel P1, Re-queue P1, Cancel P2
      if (stepsCompleted >= 3) done();
    };

    // Gestionnaire de proposition de match
    const onProposal = (data: any, client: ClientSocket, role: 'good' | 'bad') => {
      expect(data.matchId).toBeDefined();
      if (role === 'good') {
        client.emit('accept_match', { matchId: data.matchId });
      } else {
        client.emit('decline_match', { matchId: data.matchId });
      }
    };

    client1.on('match_proposal', (d) => onProposal(d, client1, 'good'));
    client2.on('match_proposal', (d) => onProposal(d, client2, 'bad'));

    // --- Assertions pour le Joueur 1 (Victime) ---
    client1.on('match_cancelled', (data) => {
      try {
        expect(data.reason).toBe('opponent_declined');
        checkDone(); // Step 1
      } catch (e) { done(e); }
    });

    // Compteur pour distinguer le premier join (manuel) du second (automatique)
    let p1JoinCount = 0;
    client1.on('queue_joined', (data) => {
      p1JoinCount++;
      // Le premier évent est émis lors du join_queue manuel (priority: undefined/false)
      // Le second est émis par le service après le cancel (priority: true)
      if (p1JoinCount === 2) {
        try {
          expect(data.userId).toBe(p1Id);
          expect(data.priority).toBe(true);
          checkDone(); // Step 2
        } catch (e) { done(e); }
      }
    });

    // --- Assertions pour le Joueur 2 (Coupable) ---
    client2.on('match_cancelled', (data) => {
      try {
        expect(data.reason).toBe('penalty_applied');
        checkDone(); // Step 3
      } catch (e) { done(e); }
    });

    // Lancement
    client1.on('connect', () => client1.emit('join_queue', { elo }));
    client2.on('connect', () => client2.emit('join_queue', { elo }));
  }, 10000);

  it('should NOT match incompatible players (ELO Gap)', (done) => {
    const pLowId = 'player-low';   // Elo 800
    const pHighId = 'player-high'; // Elo 3000
    
    // Mock dynamique : retourne l'elo en fonction de l'ID passé
    getUserEloSpy.mockImplementation(async (userId) => {
      if (userId === pLowId) return 800;
      if (userId === pHighId) return 3000;
      return 1000;
    });

    const clientLow = connectClient(createToken(pLowId));
    const clientHigh = connectClient(createToken(pHighId));

    let unexpectedMatch = false;

    // Si l'un des deux reçoit une proposition, c'est un échec du test
    const failOnMatch = () => {
      unexpectedMatch = true;
      done(new Error('Incompatible players were matched! Algo logic failed.'));
    };

    clientLow.on('match_proposal', failOnMatch);
    clientHigh.on('match_proposal', failOnMatch);

    clientLow.on('connect', () => clientLow.emit('join_queue'));
    clientHigh.on('connect', () => clientHigh.emit('join_queue'));

    // On attend 1.5 secondes (plusieurs ticks de boucle de matchmaking). 
    // Si rien ne se passe, c'est que l'algo a bien fait son travail de filtrage.
    setTimeout(() => {
      if (!unexpectedMatch) {
        expect(unexpectedMatch).toBe(false);
        done();
      }
    }, 1500);
  });
});