FROM node:22-alpine

WORKDIR /usr/src/app

# Installation de pnpm
RUN npm install -g pnpm

# ==============================================================================
# 1. COPIE DES FICHIERS DE CONFIGURATION (DEPENDENCIES LAYER)
# ==============================================================================

# Fichiers de configuration du Workspace (Racine)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Manifestes des dépendances spécifiques
COPY packages/my-fastify-decorators/package.json ./packages/my-fastify-decorators/
COPY packages/my-class-validator/package.json ./packages/my-class-validator/
COPY apps/auth/package.json ./apps/auth/

# Installation des dépendances
RUN pnpm install --no-frozen-lockfile

# ==============================================================================
# 2. COPIE DU CODE SOURCE (APPLICATION LAYER)
# ==============================================================================

# Copie du code source des packages
COPY packages/my-fastify-decorators ./packages/my-fastify-decorators
COPY packages/my-class-validator ./packages/my-class-validator

# Copie du code source de l'application
COPY apps/auth ./apps/auth

# ==============================================================================
# 3. BUILD
# ==============================================================================

# Build des packages locaux
RUN pnpm --filter my-fastify-decorators run build
RUN pnpm --filter my-class-validator run build

# Build de l'application
RUN pnpm --filter auth run build

# Exposition du port
EXPOSE 3000

# Démarrage de l'application
CMD ["node", "apps/auth/dist/src/index.js"]