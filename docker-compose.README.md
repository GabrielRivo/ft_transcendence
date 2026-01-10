# Docker Compose - Development Environment

This document provides instructions for running the ft_transcendence application locally using Docker Compose.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Services Overview](#services-overview)
- [Access URLs](#access-urls)
- [Common Commands](#common-commands)
- [Hot Reload](#hot-reload)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Cleanup](#cleanup)

---

## Prerequisites

Before starting, ensure you have the following installed:

| Tool | Minimum Version | Check Command |
|------|-----------------|---------------|
| Docker | 24.0+ | `docker --version` |
| Docker Compose | v2.20+ | `docker compose version` |
| Git | 2.30+ | `git --version` |

**System Requirements:**
- RAM: 8GB minimum (16GB recommended)
- Disk: 10GB free space
- CPU: 4 cores recommended

---

## Quick Start

### 1. Clone the Repository

```bash
git clone --recursive git@github.com:thetranscendence/ft_transcendence.git
cd ft_transcendence
```

### 2. Initialize Submodules

```bash
git submodule update --init --recursive
```

### 3. Create Environment File

```bash
cp .env.example .env
# Edit .env with your values if needed
```

### 4. Start All Services

```bash
docker compose up
```

Or in detached mode (background):

```bash
docker compose up -d
```

### 5. Access the Application

Open your browser and navigate to: **http://localhost**

---

## Services Overview

| Service | Description | Internal Port | Technology |
|---------|-------------|---------------|------------|
| **nginx** | Reverse proxy | 80 | NGINX Alpine |
| **rabbitmq** | Message broker | 5672, 15672 | RabbitMQ 3 |
| **auth** | Authentication & OAuth | 3000 | Fastify/Node.js |
| **user** | User profiles & friends | 3000 | Fastify/Node.js |
| **game** | Pong game server | 3000 | Fastify/Node.js |
| **chat** | Real-time messaging | 3000 | Fastify/Node.js |
| **matchmaking** | ELO matchmaking | 3000 | Fastify/Node.js |
| **frontend** | Web application | 5173 | Vite/React |

---

## Access URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Application | http://localhost | - |
| RabbitMQ Management | http://localhost:15672 | guest / guest |

### API Endpoints (via NGINX)

| Endpoint | Service |
|----------|---------|
| `http://localhost/api/auth/*` | Authentication |
| `http://localhost/api/user/*` | User Management |
| `http://localhost/api/game/*` | Game Server |
| `http://localhost/api/chat/*` | Chat Service |
| `http://localhost/api/matchmaking/*` | Matchmaking |

---

## Common Commands

### Starting Services

```bash
# Start all services
docker compose up

# Start in detached mode (background)
docker compose up -d

# Start specific service(s)
docker compose up auth frontend

# Rebuild and start (after Dockerfile changes)
docker compose up --build
```

### Viewing Logs

```bash
# All services
docker compose logs

# Follow logs in real-time
docker compose logs -f

# Specific service
docker compose logs -f auth

# Last 100 lines
docker compose logs --tail=100 frontend
```

### Managing Services

```bash
# Stop all services
docker compose stop

# Restart all services
docker compose restart

# Restart specific service
docker compose restart auth

# Check service status
docker compose ps
```

### Executing Commands in Containers

```bash
# Open shell in a container
docker compose exec auth sh

# Run pnpm command in a service
docker compose exec auth pnpm test

# Check Node.js version
docker compose exec frontend node --version
```

---

## Hot Reload

Hot reload is enabled by default for all services:

### Backend Services (auth, user, game, chat, matchmaking)
- Uses `tsx watch` for TypeScript hot reload
- Changes to `.ts` files trigger automatic restart
- No container rebuild needed

### Frontend (Vite)
- Uses Vite HMR (Hot Module Replacement)
- Changes appear instantly in the browser
- No page refresh needed for most changes

### When to Rebuild

You need to rebuild containers when:

```bash
# After changing Dockerfile.dev
docker compose up --build

# After adding new npm dependencies
docker compose restart <service>

# After changing package.json
docker compose exec <service> pnpm install
```

---

## Environment Variables

### Required Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing secret | `dev-jwt-secret-...` |
| `PEPPER` | Password hashing pepper | `dev-pepper-...` |
| `RABBITMQ_USER` | RabbitMQ username | `guest` |
| `RABBITMQ_PASS` | RabbitMQ password | `guest` |

### Optional Variables (OAuth)

| Variable | Description |
|----------|-------------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Secret |
| `DISCORD_CLIENT_ID` | Discord App ID |
| `DISCORD_CLIENT_SECRET` | Discord App Secret |

### Setting Up OAuth (Optional)

1. **GitHub OAuth:**
   - Go to https://github.com/settings/developers
   - Create new OAuth App
   - Set callback URL: `http://localhost/api/auth/github/callback`

2. **Discord OAuth:**
   - Go to https://discord.com/developers/applications
   - Create new Application
   - Set redirect URI: `http://localhost/api/auth/discord/callback`

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker compose logs <service>

# Verify container status
docker compose ps

# Rebuild from scratch
docker compose down
docker compose up --build
```

### Port Already in Use

```bash
# Find process using port 80
sudo lsof -i :80

# Kill the process or change the port in docker-compose.yaml
```

### Node Modules Issues

```bash
# Clear node_modules volume for a service
docker compose down
docker volume rm transcendence-auth-node-modules
docker compose up auth
```

### Permission Denied Errors

```bash
# Fix ownership of mounted volumes (Linux)
sudo chown -R $(id -u):$(id -g) apps/ packages/
```

### RabbitMQ Connection Refused

```bash
# Wait for RabbitMQ to be healthy
docker compose logs rabbitmq

# Restart dependent services
docker compose restart auth user game chat matchmaking
```

### SQLite Database Issues

```bash
# Reset database for a service
docker compose down
docker volume rm transcendence-auth-data
docker compose up auth
```

### NGINX 502 Bad Gateway

```bash
# Check if backend services are running
docker compose ps

# Check backend service logs
docker compose logs auth

# Restart NGINX after backends are ready
docker compose restart nginx
```

---

## Cleanup

### Stop Services (Keep Data)

```bash
docker compose down
```

### Stop Services and Remove Volumes (Full Reset)

```bash
# Remove all data (databases, node_modules, RabbitMQ)
docker compose down -v
```

### Remove Specific Volumes

```bash
# List volumes
docker volume ls | grep transcendence

# Remove specific volume
docker volume rm transcendence-auth-data
```

### Complete Cleanup

```bash
# Stop and remove everything
docker compose down -v --rmi local

# Remove all unused Docker resources
docker system prune -a --volumes
```

### Remove Only Node Modules Volumes

```bash
# Useful when you need to reinstall dependencies
docker volume rm \
  transcendence-auth-node-modules \
  transcendence-user-node-modules \
  transcendence-game-node-modules \
  transcendence-chat-node-modules \
  transcendence-matchmaking-node-modules \
  transcendence-frontend-node-modules
```

### Remove Only Database Volumes

```bash
# Useful for fresh database start
docker volume rm \
  transcendence-auth-data \
  transcendence-user-data \
  transcendence-game-data \
  transcendence-chat-data \
  transcendence-matchmaking-data
```

---

## Development Tips

### Viewing Real-time Logs

```bash
# Open multiple terminals or use tmux/screen
# Terminal 1: Frontend logs
docker compose logs -f frontend

# Terminal 2: Backend logs
docker compose logs -f auth user game chat matchmaking

# Terminal 3: Infrastructure logs
docker compose logs -f nginx rabbitmq
```

### Quick Service Restart

```bash
# After code changes that don't trigger hot-reload
docker compose restart auth
```

### Running Tests

```bash
# Run tests in a specific service
docker compose exec auth pnpm test
docker compose exec matchmaking pnpm test
```

### Checking Service Health

```bash
# NGINX health
curl http://localhost/nginx-health

# RabbitMQ health
docker compose exec rabbitmq rabbitmq-diagnostics -q ping
```

---

## Architecture Diagram

```
                                    ┌─────────────────────────────────────────────┐
                                    │              Docker Network                  │
                                    │           transcendence-network              │
                                    │                                              │
    ┌──────────┐                   │  ┌─────────┐                                 │
    │  Browser │ ──── :80 ────────────▶│  NGINX  │                                 │
    └──────────┘                   │  └────┬────┘                                 │
                                    │       │                                      │
                                    │       ├── /api/auth/* ──────▶ auth:3000     │
                                    │       ├── /api/user/* ──────▶ user:3000     │
                                    │       ├── /api/game/* ──────▶ game:3000     │
                                    │       ├── /api/chat/* ──────▶ chat:3000     │
                                    │       ├── /api/matchmaking/* ▶ matchmaking  │
                                    │       └── /* ───────────────▶ frontend:5173 │
                                    │                                              │
                                    │  ┌───────────┐                              │
                                    │  │ RabbitMQ  │◀──── AMQP ──── All backends  │
                                    │  │ :5672     │                              │
                                    │  │ :15672    │ (Management UI)              │
                                    │  └───────────┘                              │
                                    └─────────────────────────────────────────────┘
```

---

## Need Help?

- Check the logs: `docker compose logs -f`
- Restart everything: `docker compose down && docker compose up`
- Full reset: `docker compose down -v && docker compose up --build`
