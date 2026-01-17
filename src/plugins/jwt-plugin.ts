import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import fp from 'fastify-plugin';
import config from '../config.js';
import type { FastifyInstance, FastifyRequest } from 'fastify';

async function jwtPlugin(fastify: FastifyInstance) {
  // Enregistrement de fastify-cookie nécessaire pour lire les cookies JWT
  await fastify.register(fastifyCookie);

  // Configuration JWT
  await fastify.register(fastifyJwt as any, {
    secret: config.jwt.secret,
    cookie: {
      cookieName: config.accessTokenName,
      signed: false, // Le JWT est déjà signé
    },
    // Important: ne pas valider automatiquement pour permettre le mode hybride
    // Nous validerons manuellement dans le guard
  });

  // Décorateur pour faciliter l'accès à la validation si besoin ailleurs
  fastify.decorate('verifyJwt', async (req: FastifyRequest) => {
    return req.jwtVerify();
  });
}

export default fp(jwtPlugin, { name: 'jwt-plugin' });
