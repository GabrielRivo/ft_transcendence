# ==============================================================================
# Makefile Development - ft_transcendence
# ==============================================================================

# Variables
DOCKER_COMPOSE = docker compose
DOCKER_COMPOSE_FILE = docker-compose.yaml

# Colors
GREEN = \033[0;32m
RED = \033[0;31m
BLUE = \033[0;34m
NC = \033[0m # No Color

.PHONY: all up down restart logs build clean prune help

# Default target
all: help

# ------------------------------------------------------------------------------
# Main commands
# ------------------------------------------------------------------------------

up: ## Start the application in detached mode
	@echo "$(BLUE)Starting development environment...$(NC)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d
	@echo "$(GREEN)Development environment started!$(NC)"
	@echo "App available at http://localhost"

down: ## Stop the application
	@echo "$(BLUE)Stopping development environment...$(NC)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) down
	@echo "$(GREEN)Development environment stopped.$(NC)"

restart: down up ## Restart the application

logs: ## Follow logs of all services
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) logs -f

logs-service: ## Follow logs of a specific service (usage: make logs-service s=auth)
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) logs -f $(s)

build: ## Rebuild and start the application
	@echo "$(BLUE)Rebuilding development environment...$(NC)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d --build
	@echo "$(GREEN)Build complete and environment started!$(NC)"

# ------------------------------------------------------------------------------
# Cleaning commands
# ------------------------------------------------------------------------------

clean: ## Stop application and remove volumes (database data will be lost!)
	@echo "$(RED)Stopping and removing volumes...$(NC)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) down -v
	@echo "$(GREEN)Environment cleaned.$(NC)"

prune: ## Remove unused docker objects
	@echo "$(RED)Pruning unused docker objects...$(NC)"
	@docker system prune -f
	@echo "$(GREEN)System pruned.$(NC)"

# ------------------------------------------------------------------------------
# Helper commands
# ------------------------------------------------------------------------------

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-15s$(NC) %s\n", $$1, $$2}'
