# Makefile Infrastructure K8s - ft_transcendence
# This Makefile orchestrates the entire Kubernetes infrastructure deployment.
# It handles lifecycle management (up/down/clean), component installation
# (Vault, ELK, Monitoring), and utility commands.

# ==============================================================================
# 1. SHELL CONFIGURATION
# ==============================================================================

# Use bash for shell execution to ensure consistent behavior
SHELL := /bin/bash

# .SHELLFLAGS sets flags for the shell.
# -e: Exit immediately if a command exits with a non-zero status.
# -u: Treat unset variables as an error.
# -o pipefail: The return value of a pipeline is the status of the last command to exit with a non-zero status.
# -c: Read commands from the command_string operand.
.SHELLFLAGS := -eu -o pipefail -c

# .ONESHELL ensures all lines in a recipe are executed in the same shell instance
.ONESHELL:

# .DEFAULT_GOAL defines the default target when make is run without arguments
.DEFAULT_GOAL := help

# ==============================================================================
# 2. COLORS AND FORMATTING
# ==============================================================================

# ANSI color codes for pretty output
RESET := \033[0m
BOLD := \033[1m
RED := \033[31m
GREEN := \033[32m
YELLOW := \033[33m
BLUE := \033[34m
CYAN := \033[36m

# Helper for printing status messages
# Usage: @echo -e "$(INFO) Message..."
INFO := $(BLUE)[*]$(RESET)
SUCCESS := $(GREEN)[OK]$(RESET)
WARN := $(YELLOW)[!]$(RESET)
ERROR := $(RED)[ERROR]$(RESET)

# ==============================================================================
# 3. DIRECTORY PATHS
# ==============================================================================

# Calculate the absolute path to the infrastructure directory based on this Makefile's location
INFRASTRUCTURE_DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

# Kubernetes paths
K8S_BASE_DIR := $(INFRASTRUCTURE_DIR)/k8s/base
K8S_OVERLAYS_DIR := $(INFRASTRUCTURE_DIR)/k8s/overlays

# Helm paths
HELM_VALUES_DIR := $(INFRASTRUCTURE_DIR)/helm/values

# Scripts path
SCRIPTS_DIR := $(INFRASTRUCTURE_DIR)/scripts

# ==============================================================================
# 4. ENVIRONMENT CONFIGURATION
# ==============================================================================

# Target environment (dev, test, production). Defaults to 'dev'.
# This variable controls which Kustomize overlay is applied.
ENVIRONMENT ?= dev

# ==============================================================================
# 5. KUBERNETES NAMESPACES
# ==============================================================================

# Define namespaces for various components to avoid magic strings
NS_VAULT := vault
NS_LOGGING := logging
NS_MONITORING := monitoring
NS_PRODUCTION := production

# ==============================================================================
# 6. HELM REPOSITORIES
# ==============================================================================

# Official Helm chart repository URLs
HELM_REPO_HASHICORP := https://helm.releases.hashicorp.com
HELM_REPO_ELASTIC := https://helm.elastic.co
HELM_REPO_PROMETHEUS := https://prometheus-community.github.io/helm-charts
HELM_REPO_BITNAMI := https://charts.bitnami.com/bitnami

# ==============================================================================
# 7. TIMEOUTS AND RETRIES
# ==============================================================================

# Default timeout for waiting for resources to become ready
TIMEOUT_READY := 300s

# ==============================================================================
# 8. INTERNAL TARGETS (Prerequisites & Setup)
# ==============================================================================

# Target: _check-prerequisites
# Description: Checks if necessary tools (kubectl, helm) are installed and accessible.
# It also verifies connection to the Kubernetes cluster.
.PHONY: _check-prerequisites
_check-prerequisites:
	@echo -e "$(INFO) Checking prerequisites..."
	@# Check for kubectl
	@if ! command -v kubectl >/dev/null; then \
		echo -e "$(ERROR) kubectl could not be found. Please install it."; \
		exit 1; \
	fi
	@echo -e "$(INFO) kubectl found: $$(kubectl version --client --short 2>/dev/null || kubectl version --client | grep Client | cut -d: -f2 | tr -d ' ')"

	@# Check for helm
	@if ! command -v helm >/dev/null; then \
		echo -e "$(ERROR) helm could not be found. Please install it."; \
		exit 1; \
	fi
	@echo -e "$(INFO) helm found: $$(helm version --short)"

	@# Check cluster connection
	@if ! kubectl cluster-info; then \
		echo -e "$(ERROR) Cannot connect to Kubernetes cluster. Check your kubeconfig."; \
		exit 1; \
	fi
	@echo -e "$(SUCCESS) Connected to Kubernetes cluster."

# Target: _add-helm-repos
# Description: Adds necessary Helm repositories and updates them.
# This ensures we have the latest charts for Vault, ELK, Prometheus, etc.
.PHONY: _add-helm-repos
_add-helm-repos:
	@echo -e "$(INFO) Adding/Updating Helm repositories..."
	@helm repo add hashicorp $(HELM_REPO_HASHICORP)
	@helm repo add elastic $(HELM_REPO_ELASTIC)
	@helm repo add prometheus-community $(HELM_REPO_PROMETHEUS)
	@helm repo add bitnami $(HELM_REPO_BITNAMI)
	@helm repo update
	@echo -e "$(SUCCESS) Helm repositories updated."

# Target: _wait-for-pods
# Description: Helper target to wait for all pods in a namespace to be Ready.
# Usage: make _wait-for-pods NS=namespace_name
.PHONY: _wait-for-pods
_wait-for-pods:
	@echo -e "$(INFO) Waiting for pods in namespace $(BOLD)$(NS)$(RESET) to be ready..."
	@kubectl wait --for=condition=ready pod --all -n $(NS) --timeout=$(TIMEOUT_READY) || \
		echo -e "$(WARN) Some pods in $(NS) are not yet ready (or none exist yet). You can check status with 'make status'."

# Target: _clean-pvcs
# Description: Helper to delete all PVCs in relevant namespaces.
# WARNING: This destroys persistent data.
.PHONY: _clean-pvcs
_clean-pvcs:
	@echo -e "$(WARN) Deleting all PVCs in namespaces: $(NS_VAULT), $(NS_LOGGING), $(NS_MONITORING), $(NS_PRODUCTION)..."
	@kubectl delete pvc --all -n $(NS_VAULT) --ignore-not-found
	@kubectl delete pvc --all -n $(NS_LOGGING) --ignore-not-found
	@kubectl delete pvc --all -n $(NS_MONITORING) --ignore-not-found
	@kubectl delete pvc --all -n $(NS_PRODUCTION) --ignore-not-found
	@echo -e "$(SUCCESS) All PVCs deleted."

# Target: _clean-base
# Description: Helper to delete base resources (namespaces, quotas, etc.) via Kustomize.
.PHONY: _clean-base
_clean-base:
	@echo -e "$(INFO) Deleting base Kubernetes manifests..."
	@if [ -d "$(K8S_OVERLAYS_DIR)/$(ENVIRONMENT)" ]; then \
		kubectl delete -k $(K8S_OVERLAYS_DIR)/$(ENVIRONMENT) --ignore-not-found; \
	fi
	@echo -e "$(SUCCESS) Base manifests deleted."

# ==============================================================================
# 9. LIFECYCLE TARGETS
# ==============================================================================

# Target: up
# Description: Deploys the entire infrastructure stack in the correct order.
# Order: Prerequisites -> Base -> Vault -> Infrastructure -> ELK -> Monitoring
# Note: Now includes Vault Initialization and Secrets Population
.PHONY: up
up: _check-prerequisites base-up vault-up vault-init vault-secrets infra-up elk-up monitoring-up
	@echo -e "\n$(SUCCESS) $(BOLD)Infrastructure successfully deployed!$(RESET)"
	@echo -e "You can check the status with: $(BOLD)make status$(RESET)"

# Target: down
# Description: Stops the entire infrastructure stack in reverse order.
# Note: This does NOT delete PersistentVolumeClaims (data is preserved).
.PHONY: down
down: monitoring-down elk-down infra-down vault-down
	@echo -e "\n$(SUCCESS) $(BOLD)Infrastructure stopped (PVCs preserved).$(RESET)"
	@echo -e "To remove data, use: $(BOLD)make clean$(RESET)"

# Target: clean
# Description: Completely destroys the infrastructure, INCLUDING DATA.
# Calls 'down' first, then deletes PVCs and base resources (namespaces).
# It also removes the local .vault-keys file to ensure a fresh start next time.
# WARNING: Also deletes 'Released' PersistentVolumes (orphan data from Retain policy).
.PHONY: clean
clean: down _clean-pvcs _clean-base
	@echo -e "$(WARN) removing local vault keys..."
	@rm -f $(INFRASTRUCTURE_DIR)/../.vault-keys
	@echo -e "$(WARN) Cleaning up released PersistentVolumes..."
	@kubectl get pv | grep Released | awk '{print $$1}' | xargs -r kubectl delete pv || true
	@echo -e "\n$(SUCCESS) $(BOLD)Infrastructure completely cleaned (Data destroyed).$(RESET)"

# ==============================================================================
# 10. BASE COMPONENT TARGETS
# ==============================================================================

# Target: base-up
# Description: Applies the base Kubernetes manifests using Kustomize.
# It selects the overlay based on the ENVIRONMENT variable (dev/test/production).
# This sets up namespaces, resource quotas, limit ranges, and storage classes.
.PHONY: base-up
base-up: _check-prerequisites
	@echo -e "$(INFO) Applying base Kubernetes manifests for environment: $(BOLD)$(ENVIRONMENT)$(RESET)..."
	@if [ ! -d "$(K8S_OVERLAYS_DIR)/$(ENVIRONMENT)" ]; then \
		echo -e "$(ERROR) Overlay for environment '$(ENVIRONMENT)' not found at $(K8S_OVERLAYS_DIR)/$(ENVIRONMENT)"; \
		exit 1; \
	fi
	@kubectl apply -k $(K8S_OVERLAYS_DIR)/$(ENVIRONMENT)
	@echo -e "$(INFO) Waiting for namespaces to be created..."
	@# Small wait to ensure namespaces are registered before proceeding to other steps
	@sleep 2
	@echo -e "$(SUCCESS) Base manifests applied successfully."

# ==============================================================================
# 11. VAULT COMPONENT
# ==============================================================================

# Target: vault-up
# Description: Installs Vault using the official HashiCorp Helm chart.
# Deploys into the 'vault' namespace.
# Depends on base-up to ensure namespace and storage classes exist.
.PHONY: vault-up
vault-up: base-up _add-helm-repos
	@echo -e "$(INFO) Installing Vault in namespace $(BOLD)$(NS_VAULT)$(RESET)..."
	@helm upgrade --install vault hashicorp/vault \
		--namespace $(NS_VAULT) \
		--values $(HELM_VALUES_DIR)/vault.yaml \
		--wait --timeout $(TIMEOUT_READY)
	@echo -e "$(SUCCESS) Vault installed."

# Target: vault-init
# Description: Initializes Vault, unseals it, enables KV v2, applies policies and K8s auth.
# Uses the setup-vault.sh script.
.PHONY: vault-init
vault-init:
	@echo -e "$(INFO) Initializing and Configuring Vault..."
	@$(SCRIPTS_DIR)/setup-vault.sh
	@echo -e "$(SUCCESS) Vault initialized and configured."

# Target: vault-secrets
# Description: Populates Vault with initial random secrets for microservices.
# Uses the init-secrets.sh script.
.PHONY: vault-secrets
vault-secrets:
	@echo -e "$(INFO) Populating initial secrets..."
	@$(SCRIPTS_DIR)/init-secrets.sh
	@echo -e "$(SUCCESS) Secrets populated."

# Target: vault-unseal
# Description: Helper target to manually unseal Vault if needed (e.g. after restart).
# In practice, vault-init handles this idempotently, but this is a shortcut.
.PHONY: vault-unseal
vault-unseal:
	@echo -e "$(INFO) Attempting to unseal Vault..."
	@# Re-run setup script which handles unseal check
	@$(SCRIPTS_DIR)/setup-vault.sh
	@echo -e "$(SUCCESS) Unseal check complete."

# Target: vault-policies
# Description: Reloads Vault policies from the policies directory.
# Useful when developing new policies without full init.
.PHONY: vault-policies
vault-policies:
	@echo -e "$(INFO) Reloading Vault policies..."
	@# We can reuse setup-vault.sh which applies policies every run
	@$(SCRIPTS_DIR)/setup-vault.sh
	@echo -e "$(SUCCESS) Policies reloaded."

# Target: vault-status
# Description: Displays detailed Vault status.
.PHONY: vault-status
vault-status:
	@echo -e "$(INFO) Vault Status:"
	@kubectl exec -n $(NS_VAULT) vault-0 -- vault status || true
	@echo -e "\n$(INFO) Auth Methods:"
	@kubectl exec -n $(NS_VAULT) vault-0 -- vault auth list || true
	@echo -e "\n$(INFO) Secrets Engines:"
	@kubectl exec -n $(NS_VAULT) vault-0 -- vault secrets list || true

# Target: vault-down
# Description: Uninstalls Vault and removes related resources.
.PHONY: vault-down
vault-down:
	@echo -e "$(INFO) Uninstalling Vault..."
	@helm uninstall vault --namespace $(NS_VAULT) --ignore-not-found
	@echo -e "$(SUCCESS) Vault uninstalled."

# ==============================================================================
# 12. ELK STACK COMPONENT
# ==============================================================================

# Target: elk-up
# Description: Installs the ELK Stack (Elasticsearch, Logstash, Kibana).
# Deploys into the 'logging' namespace.
.PHONY: elk-up
elk-up: base-up _add-helm-repos
	@echo -e "$(INFO) Installing Elasticsearch in namespace $(BOLD)$(NS_LOGGING)$(RESET)..."
	@helm upgrade --install elasticsearch elastic/elasticsearch \
		--namespace $(NS_LOGGING) \
		--values $(HELM_VALUES_DIR)/elasticsearch.yaml \
		--wait --timeout $(TIMEOUT_READY)

	@echo -e "$(INFO) Installing Kibana in namespace $(BOLD)$(NS_LOGGING)$(RESET)..."
	@helm upgrade --install kibana elastic/kibana \
		--namespace $(NS_LOGGING) \
		--values $(HELM_VALUES_DIR)/kibana.yaml \
		--wait --timeout $(TIMEOUT_READY)

	@echo -e "$(INFO) Installing Logstash in namespace $(BOLD)$(NS_LOGGING)$(RESET)..."
	@helm upgrade --install logstash elastic/logstash \
		--namespace $(NS_LOGGING) \
		--values $(HELM_VALUES_DIR)/logstash.yaml \
		--wait --timeout $(TIMEOUT_READY)
	@echo -e "$(SUCCESS) ELK Stack installed."

# Target: elk-down
# Description: Uninstalls the ELK Stack.
.PHONY: elk-down
elk-down:
	@echo -e "$(INFO) Uninstalling ELK Stack..."
	@helm uninstall logstash --namespace $(NS_LOGGING) --ignore-not-found
	@helm uninstall kibana --namespace $(NS_LOGGING) --ignore-not-found
	@helm uninstall elasticsearch --namespace $(NS_LOGGING) --ignore-not-found
	@echo -e "$(SUCCESS) ELK Stack uninstalled."

# ==============================================================================
# 13. MONITORING COMPONENT
# ==============================================================================

# Target: monitoring-up
# Description: Installs Prometheus and Grafana via kube-prometheus-stack.
# Deploys into the 'monitoring' namespace.
.PHONY: monitoring-up
monitoring-up: base-up _add-helm-repos
	@echo -e "$(INFO) Installing kube-prometheus-stack in namespace $(BOLD)$(NS_MONITORING)$(RESET)..."
	@helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
		--namespace $(NS_MONITORING) \
		--values $(HELM_VALUES_DIR)/prometheus.yaml \
		--wait --timeout $(TIMEOUT_READY)
	@echo -e "$(SUCCESS) Monitoring stack installed."

# Target: monitoring-down
# Description: Uninstalls the Monitoring stack.
.PHONY: monitoring-down
monitoring-down:
	@echo -e "$(INFO) Uninstalling Monitoring stack..."
	@helm uninstall prometheus --namespace $(NS_MONITORING) --ignore-not-found
	@echo -e "$(SUCCESS) Monitoring stack uninstalled."

# ==============================================================================
# 14. INFRASTRUCTURE COMPONENT (Redis/RabbitMQ)
# ==============================================================================

# Target: infra-up
# Description: Installs infrastructure services (Redis, RabbitMQ).
# Deploys into the 'production' namespace.
.PHONY: infra-up
infra-up: base-up _add-helm-repos
	@echo -e "$(INFO) Installing Redis in namespace $(BOLD)$(NS_PRODUCTION)$(RESET)..."
	@helm upgrade --install redis bitnami/redis \
		--namespace $(NS_PRODUCTION) \
		--values $(HELM_VALUES_DIR)/redis.yaml \
		--wait --timeout $(TIMEOUT_READY)

	@echo -e "$(INFO) Installing RabbitMQ in namespace $(BOLD)$(NS_PRODUCTION)$(RESET)..."
	@helm upgrade --install rabbitmq bitnami/rabbitmq \
		--namespace $(NS_PRODUCTION) \
		--values $(HELM_VALUES_DIR)/rabbitmq.yaml \
		--wait --timeout $(TIMEOUT_READY)
	@echo -e "$(SUCCESS) Infrastructure services installed."

# Target: infra-down
# Description: Uninstalls infrastructure services.
.PHONY: infra-down
infra-down:
	@echo -e "$(INFO) Uninstalling Infrastructure services..."
	@helm uninstall redis --namespace $(NS_PRODUCTION) --ignore-not-found
	@helm uninstall rabbitmq --namespace $(NS_PRODUCTION) --ignore-not-found
	@echo -e "$(SUCCESS) Infrastructure services uninstalled."

# ==============================================================================
# 15. UTILITY TARGETS
# ==============================================================================

# Target: status
# Description: Displays the status of all pods in the relevant namespaces.
.PHONY: status
status:
	@echo -e "$(INFO) Infrastructure Status:"
	@echo -e "\n$(BOLD)==> Namespace: $(NS_VAULT)$(RESET)"
	@kubectl get pods -n $(NS_VAULT) -o wide
	@echo -e "\n$(BOLD)==> Namespace: $(NS_LOGGING)$(RESET)"
	@kubectl get pods -n $(NS_LOGGING) -o wide
	@echo -e "\n$(BOLD)==> Namespace: $(NS_MONITORING)$(RESET)"
	@kubectl get pods -n $(NS_MONITORING) -o wide
	@echo -e "\n$(BOLD)==> Namespace: $(NS_PRODUCTION)$(RESET)"
	@kubectl get pods -n $(NS_PRODUCTION) -o wide

# Target: logs
# Description: Displays aggregated logs from key components.
# Shows the last 20 lines of logs for each component.
.PHONY: logs
logs:
	@echo -e "$(INFO) Fetching recent logs..."
	@echo -e "\n$(BOLD)==> Vault Logs:$(RESET)"
	@kubectl logs -n $(NS_VAULT) -l app.kubernetes.io/name=vault --tail=20 --all-containers=true 2>/dev/null || echo "No Vault pods found"
	@echo -e "\n$(BOLD)==> Kibana Logs:$(RESET)"
	@kubectl logs -n $(NS_LOGGING) -l app=kibana --tail=20 --all-containers=true 2>/dev/null || echo "No Kibana pods found"
	@echo -e "\n$(BOLD)==> Grafana Logs:$(RESET)"
	@kubectl logs -n $(NS_MONITORING) -l app.kubernetes.io/name=grafana --tail=20 --all-containers=true 2>/dev/null || echo "No Grafana pods found"

# Target: port-forward
# Description: Exposes internal services to localhost for access.
# Vault: 8200, Kibana: 5601, Grafana: 3000
# NOTE: This command blocks the terminal.
.PHONY: port-forward
port-forward:
	@echo -e "$(INFO) Starting port-forwarding... (Press Ctrl+C to stop)"
	@echo -e "  - Vault:   http://localhost:8200"
	@echo -e "  - Kibana:  http://localhost:5601"
	@echo -e "  - Grafana: http://localhost:3000"
	@trap 'kill %1 %2 %3' SIGINT; \
	kubectl port-forward -n $(NS_VAULT) svc/vault 8200:8200 & \
	kubectl port-forward -n $(NS_LOGGING) svc/kibana-kibana 5601:5601 & \
	kubectl port-forward -n $(NS_MONITORING) svc/prometheus-grafana 3000:80 & \
	wait

# Target: health
# Description: Runs a health check on the infrastructure.
# (Placeholder: In the future, this will run a dedicated script)
.PHONY: health
health:
	@echo -e "$(INFO) Checking infrastructure health..."
	@# Check if all pods are ready
	@kubectl get pods -A --field-selector=status.phase!=Running,status.phase!=Succeeded --no-headers 2>/dev/null | grep -v "No resources found" || echo -e "$(SUCCESS) All pods are running."

# Target: help
# Description: Displays this help message.
.PHONY: help
help:
	@echo -e "$(BOLD)Infrastructure Makefile Helper$(RESET)"
	@echo -e "Usage: make [target] [ENVIRONMENT=dev|test|production]"
	@echo -e "\n$(BOLD)Lifecycle Targets:$(RESET)"
	@echo -e "  $(CYAN)up$(RESET)            Deploy full infrastructure"
	@echo -e "  $(CYAN)down$(RESET)          Stop infrastructure (keep data)"
	@echo -e "  $(CYAN)clean$(RESET)         Destroy infrastructure (DELETE DATA)"
	@echo -e "\n$(BOLD)Component Targets:$(RESET)"
	@echo -e "  $(CYAN)base-up$(RESET)       Apply base manifests"
	@echo -e "  $(CYAN)vault-up/down$(RESET) Manage Vault"
	@echo -e "  $(CYAN)vault-init$(RESET)    Initialize and Unseal Vault"
	@echo -e "  $(CYAN)vault-secrets$(RESET) Populate initial secrets"
	@echo -e "  $(CYAN)vault-status$(RESET)  Show detailed Vault status"
	@echo -e "  $(CYAN)elk-up/down$(RESET)   Manage ELK Stack"
	@echo -e "  $(CYAN)infra-up/down$(RESET) Manage Redis/RabbitMQ"
	@echo -e "  $(CYAN)monitoring-up/down$(RESET) Manage Monitoring"
	@echo -e "\n$(BOLD)Utility Targets:$(RESET)"
	@echo -e "  $(CYAN)status$(RESET)        Show pod status"
	@echo -e "  $(CYAN)logs$(RESET)          Show recent logs"
	@echo -e "  $(CYAN)port-forward$(RESET)  Expose UIs to localhost"
	@echo -e "  $(CYAN)health$(RESET)        Check health status"
