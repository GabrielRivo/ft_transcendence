# ==============================================================================
# Makefile - ft_transcendence
# ==============================================================================

# Variables
DOCKER_COMPOSE = docker compose
DOCKER_COMPOSE_FILE = docker-compose.yaml
DOCKER_COMPOSE_PROD = docker compose
DOCKER_COMPOSE_PROD_FILE = docker-compose.prod.yaml

# Colors
GREEN = \033[0;32m
RED = \033[0;31m
BLUE = \033[0;34m
NC = \033[0m # No Color

.PHONY: all up down restart logs build clean prune help \
        dev-up dev-down dev-restart dev-logs dev-logs-service dev-build dev-clean dev-prune \
        install update-submodules

# Default target
all: help

# ------------------------------------------------------------------------------
# Production Commands (Default)
# ------------------------------------------------------------------------------

up: ## Start the application in production mode (generates SSL certs if missing)
	@if [ ! -f pnpm-lock.yaml ]; then \
		echo "$(BLUE)pnpm-lock.yaml not found. Installing dependencies...$(NC)"; \
		pnpm install; \
	fi
	@echo "$(BLUE)Generating SSL certificates if missing...$(NC)"
	@mkdir -p ./nginx/ssl
	@if [ ! -f ./nginx/ssl/server.crt ]; then \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
		-keyout ./nginx/ssl/server.key \
		-out ./nginx/ssl/server.crt \
		-subj "/C=FR/ST=IDF/L=Paris/O=42/OU=Transcendence/CN=localhost" 2>/dev/null; \
		echo "$(GREEN)SSL certificates generated.$(NC)"; \
	else \
		echo "$(GREEN)SSL certificates already exist.$(NC)"; \
	fi
	@echo "$(BLUE)Starting production environment...$(NC)"
	@$(DOCKER_COMPOSE_PROD) -f $(DOCKER_COMPOSE_PROD_FILE) up -d --build
	@echo "$(GREEN)Production environment started!$(NC)"
	@echo "App available at https://localhost"

down: ## Stop the production environment
	@echo "$(BLUE)Stopping production environment...$(NC)"
	@$(DOCKER_COMPOSE_PROD) -f $(DOCKER_COMPOSE_PROD_FILE) down
	@echo "$(GREEN)Production environment stopped.$(NC)"

restart: down up ## Restart the production environment

logs: ## Follow logs of all services (production)
	@$(DOCKER_COMPOSE_PROD) -f $(DOCKER_COMPOSE_PROD_FILE) logs -f

build: ## Rebuild and start the production environment
	@echo "$(BLUE)Rebuilding production environment...$(NC)"
	@$(DOCKER_COMPOSE_PROD) -f $(DOCKER_COMPOSE_PROD_FILE) up -d --build
	@echo "$(GREEN)Build complete and environment started!$(NC)"

clean: ## Stop application and remove volumes (production) (Warning: database data will be lost!)
	@echo "$(RED)Stopping and removing volumes...$(NC)"
	@$(DOCKER_COMPOSE_PROD) -f $(DOCKER_COMPOSE_PROD_FILE) down -v
	@echo "$(GREEN)Environment cleaned.$(NC)"

prune: ## Remove unused docker objects (production context)
	@echo "$(RED)Pruning unused docker objects...$(NC)"
	@docker stop $(docker ps -qa) 2>/dev/null; docker rm $(docker ps -qa) 2>/dev/null; docker volume rm $(docker volume ls -q) 2>/dev/null; docker network prune -f; docker system prune -a --volumes -f
	@echo "$(GREEN)System pruned.$(NC)"

# ------------------------------------------------------------------------------
# Development Commands (dev-*)
# ------------------------------------------------------------------------------

dev-up: ## Start the application in detached mode (dev)
	@echo "$(BLUE)Starting development environment...$(NC)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d
	@echo "$(GREEN)Development environment started!$(NC)"
	@echo "App available at http://localhost"

dev-down: ## Stop the application (dev)
	@echo "$(BLUE)Stopping development environment...$(NC)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) down
	@echo "$(GREEN)Development environment stopped.$(NC)"

dev-restart: dev-down dev-up ## Restart the application (dev)

dev-logs: ## Follow logs of all services (dev)
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) logs -f

dev-logs-service: ## Follow logs of a specific service (dev usage: make dev-logs-service s=auth)
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) logs -f $(s)

dev-build: ## Rebuild and start the application (dev)
	@echo "$(BLUE)Rebuilding development environment...$(NC)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d --build
	@echo "$(GREEN)Build complete and environment started!$(NC)"

dev-clean: ## Stop application and remove volumes (dev) (database data will be lost!)
	@echo "$(RED)Stopping and removing volumes...$(NC)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) down -v
	@echo "$(GREEN)Environment cleaned.$(NC)"

dev-prune: ## Remove unused docker objects (dev context)
	@echo "$(RED)Pruning unused docker objects...$(NC)"
	@docker system prune -f
	@echo "$(GREEN)System pruned.$(NC)"

# Alias for dev compatibility
dev: dev-up

# ------------------------------------------------------------------------------
# Helper Commands
# ------------------------------------------------------------------------------

install: ## Install dependencies locally (pnpm)
	@echo "Installing dependencies locally..."
	@pnpm install
	@echo "Dependencies installed."

update-submodules: ## Update git submodules
	@echo "Updating git submodules..."
	@git submodule update --remote
	@echo "Submodules updated."

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(NC) %s\n", $$1, $$2}'
