import 'reflect-metadata'; // Toujours en premier
import { describe, it, expect, beforeAll, afterAll, afterEach, jest } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';
import { bootstrap } from 'my-fastify-decorators';
import { io as Client, type Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { AddressInfo } from 'net';

// Import plugins
import socketPlugin from '../plugins/socket-plugin.js';
import sqlitePlugin from '../plugins/sqlite-plugin.js';

// --- IMPORT DU VRAI MODULE ---
// Au lieu de définir une classe TestMatchmakingModule, on utilise celle de l'app.
import { MatchmakingModule } from './matchmaking.module.js';
import { UserService } from './user.service.js';

const TEST_SECRET = 'super-secret-test-key';

describe('Matchmaking Integration Test Suite', () => {
  let app: FastifyInstance;
  let serverPort: number;
  let serverUrl: string;
  let activeClients: ClientSocket[] = [];

  // On espionne le prototype pour que l'instance créée par le module réel soit affectée
  const getUserEloSpy = jest.spyOn(UserService.prototype, 'getUserElo');

  const createToken = (userId: string, email: string = 'test@example.com') => {
    return jwt.sign({ sub: userId, email }, TEST_SECRET);
  };

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

  // --- Phase de Démarrage ---
  beforeAll(async () => {
    console.debug('[TEST] [Setup] Initializing Fastify server...');

    app = Fastify({
      logger: {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      },
    });

    // ==========================================================
    // CORRECTION ICI : Enregistrement des plugins d'infrastructure
    // ==========================================================
    
    // 1. On enregistre SQLite pour que 'app.db' existe
    await app.register(sqlitePlugin); 
    
    // 2. On enregistre Socket.IO
    await app.register(socketPlugin);

    // 3. IMPORTANT : On attend que Fastify charge ces plugins
    await app.after();

    // 4. Simulation JWT (inchangé)
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

    // 5. Bootstrap du module
    // Maintenant, quand le repository va s'initialiser, 'app.db' sera disponible
    await bootstrap(app, MatchmakingModule);

    // 6. Démarrage serveur
    await app.ready();
    await app.listen({ port: 0, host: '127.0.0.1' });

    const address = app.server.address() as AddressInfo;
    serverPort = address.port;
    serverUrl = `http://127.0.0.1:${serverPort}`;

    console.debug(`[TEST] [Setup] Server listening on ${serverUrl}`);
  });

  // --- Phase de Nettoyage ---
  afterEach(() => {
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
  // TEST 1 : Vérification de la santé du service (REST)
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

  // ===========================================================================
  // TEST 2 : Flux WebSocket Nominal
  // ===========================================================================
  it('should allow a user to connect and join the queue', (done) => {
    const userId = 'user-123';
    const userElo = 1500;
    getUserEloSpy.mockResolvedValue(userElo);

    const token = createToken(userId, 'test@example.com');
    const socket = connectClient(token);

    socket.on('connect_error', (err) => done(err));

    socket.on('connect', () => {
      socket.emit('join_queue', { elo: userElo });
    });

    socket.on('queue_joined', async (data) => {
      try {
        expect(data.userId).toBe(userId);
        expect(data.elo).toBe(userElo);

        const queueResponse = await app.inject({
          method: 'GET',
          url: '/matchmaking/queue',
        });
        
        const stats = JSON.parse(queueResponse.payload);
        expect(stats.size).toBe(1);
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  // ===========================================================================
  // TEST 3 : Validation Zod (Payload Invalide)
  // ===========================================================================
  it('should reject invalid payloads with an error event', (done) => {
    getUserEloSpy.mockResolvedValue(1000);
    const token = createToken('user-invalid', 'fail@example.com');
    const socket = connectClient(token);

    socket.on('connect', () => {
      socket.emit('join_queue', { elo: -50 });
    });

    socket.on('error', (err) => {
      try {
        expect(err).toBeDefined();
        // Vérification flexible du message d'erreur
        if (err.message) {
            expect(err.message).toMatch(/(Invalid|payload)/i);
        }
        done();
      } catch (error) {
        done(error);
      }
    });
  });

  // ===========================================================================
  // TEST 4 : Nettoyage automatique à la déconnexion
  // ===========================================================================
  it('should remove player from queue upon disconnection', (done) => {
    getUserEloSpy.mockResolvedValue(1200);
    const token = createToken('user-leaver', 'leaver@example.com');
    const socket = connectClient(token);

    socket.on('connect', () => {
      socket.emit('join_queue', { elo: 1200 });
    });

    socket.on('queue_joined', async () => {
      socket.disconnect();

      // Petit délai pour laisser le serveur traiter la déconnexion
      await new Promise((resolve) => setTimeout(resolve, 300));

      const response = await app.inject({
        method: 'GET',
        url: '/matchmaking/queue',
      });

      try {
        const stats = JSON.parse(response.payload);
        expect(stats.size).toBe(0);
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  // ===========================================================================
  // TEST 5 : Quitter la file manuellement
  // ===========================================================================
  it('should allow a user to leave the queue manually', (done) => {
    getUserEloSpy.mockResolvedValue(1300);
    const client = connectClient(createToken('user-cancels'));

    client.on('connect', () => {
      client.emit('join_queue', { elo: 1300 });
    });

    client.on('queue_joined', () => {
      // Une fois dans la file, on demande à sortir
      client.emit('leave_queue');
    });

    client.on('queue_left', async (data) => {
      try {
        expect(data.userId).toBe('user-cancels');
        
        // Vérification côté serveur que la file est vide
        const response = await app.inject({
          method: 'GET',
          url: '/matchmaking/queue',
        });
        const stats = JSON.parse(response.payload);
        expect(stats.size).toBe(0);
        
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  // ===========================================================================
  // TEST 6 : Gestion de l'erreur "Déjà dans la file"
  // ===========================================================================
  it('should return an error if user tries to join queue twice', (done) => {
    getUserEloSpy.mockResolvedValue(1400);
    const client = connectClient(createToken('user-spam'));

    client.on('connect', () => {
      client.emit('join_queue', { elo: 1400 });
    });

    client.on('queue_joined', () => {
      // Tentative de rejoindre une seconde fois
      client.emit('join_queue', { elo: 1400 });
    });

    // On s'attend à recevoir une erreur pour la seconde tentative
    client.on('error', (err) => {
      try {
        expect(err).toBeDefined();
        // Le message dépend de votre implémentation dans MatchmakingService
        // Assurez-vous qu'il contient quelque chose comme "already in queue"
        expect(err.message).toMatch(/(already|exist|queue)/i);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  // ===========================================================================
  // TEST 7 : Refus de connexion si le UserService échoue
  // ===========================================================================
  it('should disconnect client if user data cannot be loaded', (done) => {
    // On simule une erreur critique
    getUserEloSpy.mockRejectedValue(new Error('Database connection failed'));

    const client = connectClient(createToken('user-fail-db'));

    // On écoute la déconnexion, c'est le succès attendu
    client.once('disconnect', (reason) => {
      try {
        expect(reason).toBe('io server disconnect');
        done();
      } catch (e) {
        done(e);
      }
    });
  });
});