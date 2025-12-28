FROM node:22-alpine AS development

WORKDIR /usr/src/app

RUN npm install -g pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/my-fastify-decorators ./packages/my-fastify-decorators
# ... copie les autres packages si nécessaire ...
COPY apps/matchmaking ./apps/matchmaking

RUN pnpm install

WORKDIR /usr/src/app/apps/matchmaking
CMD ["pnpm", "start:dev"]