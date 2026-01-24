# --- Étape 1 : Builder l'application (Node.js) ---
FROM node:24-alpine AS build

# Arguments de build pour les variables d'environnement Vite
ARG NODE_ENV=production
ARG VITE_API_URL

WORKDIR /app

# Installation de pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copie des fichiers de dépendances
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json ./apps/frontend/

# Copier les package.json des packages locaux
COPY packages/my-react/package.json ./packages/my-react/
COPY packages/my-react-router/package.json ./packages/my-react-router/
COPY packages/my-class-validator/package.json ./packages/my-class-validator/

# Installation des dépendances
RUN pnpm install --frozen-lockfile

# Copie du code source des packages locaux
COPY packages/my-react ./packages/my-react
COPY packages/my-react-router ./packages/my-react-router
COPY packages/my-class-validator ./packages/my-class-validator

# Build des packages locaux
RUN pnpm --filter my-react run build
RUN pnpm --filter my-react-router run build
RUN pnpm --filter my-class-validator run build

# Copie du code source du frontend
COPY apps/frontend ./apps/frontend

# Définir les variables d'environnement pour le build
ENV NODE_ENV=${NODE_ENV}
ENV VITE_API_URL=${VITE_API_URL}

# Construction du projet (génère le dossier /dist)
RUN pnpm --filter frontend run build