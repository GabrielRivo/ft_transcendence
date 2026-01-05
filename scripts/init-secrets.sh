#!/bin/bash
# ==============================================================================
# Vault Secrets Initialization Script
# ==============================================================================
#
# Context: ft_transcendence DevOps Module
#
# Purpose:
#   This script populates Vault with initial random secrets for the microservices.
#   It ensures that necessary secrets exist without overwriting existing ones
#   (idempotent behavior). It is designed to be extensible for adding new
#   secrets easily.
#
# Usage:
#   ./infrastructure/scripts/init-secrets.sh [options]
#
# Options:
#   -f, --force   Force overwrite existing secrets (DANGER!)
#
# Dependencies:
#   - kubectl
#   - jq
#   - openssl (for random generation)
#
# ==============================================================================

set -e

# ------------------------------------------------------------------------------
# Configuration & Variables
# ------------------------------------------------------------------------------

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Paths & Vault Info
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
KEYS_FILE="$PROJECT_ROOT/.vault-keys"
VAULT_NAMESPACE="vault"
VAULT_POD="vault-0"

FORCE_OVERWRITE=false

# ------------------------------------------------------------------------------
# Argument Parsing
# ------------------------------------------------------------------------------

for arg in "$@"; do
    case $arg in
        -f|--force)
            FORCE_OVERWRITE=true
            shift
            ;;
    esac
done

# ------------------------------------------------------------------------------
# Helper Functions
# ------------------------------------------------------------------------------

log_info() { echo -e "${GREEN}[INFO] $1${NC}"; }
log_warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
log_error() { echo -e "${RED}[ERROR] $1${NC}"; }

check_dependency() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed."
        exit 1
    fi
}

# Generate a random alphanumeric string
generate_password() {
    local length="${1:-32}"
    openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c "$length"
}

# Generate a UUID
generate_uuid() {
    cat /proc/sys/kernel/random/uuid
}

# Generate a hex string
generate_hex() {
    local length="${1:-32}"
    openssl rand -hex "$length"
}

# Check if Vault is accessible and logged in
check_vault_access() {
    if ! kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault status >/dev/null 2>&1; then
        log_error "Vault is not accessible. Is it running and unsealed?"
        exit 1
    fi
    
    # Check if we have a token (we assume setup-vault.sh was run and we are root)
    # Ideally, we should source the token from .vault-keys if needed, but the pod
    # environment doesn't persist the token across execs unless we pass it.
    
    if [[ ! -f "$KEYS_FILE" ]]; then
        log_error "Keys file not found at $KEYS_FILE. Cannot authenticate."
        exit 1
    fi
    
    local root_token=$(jq -r '.root_token' "$KEYS_FILE")
    if [[ -z "$root_token" || "$root_token" == "null" ]]; then
        log_error "Root token not found in keys file."
        exit 1
    fi
    
    # Login explicitly for this session
    kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault login "$root_token" > /dev/null
}

# Ensure a secret exists
# Usage: ensure_secret "path/to/secret" "key" "generator_type" [length]
# Types: password, uuid, hex, static
ensure_secret() {
    local path="$1"
    local key="$2"
    local type="$3"
    local length="$4"
    local static_value="$5"
    
    log_info "Checking secret: $path -> $key"
    
    # Check if secret exists and has the key
    local current_value=""
    # We use 'vault kv get -field=key path' to check specific key
    # We trap error because if key doesn't exist, vault returns exit code 2
    if ! $FORCE_OVERWRITE; then
        current_value=$(kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault kv get -field="$key" "$path" 2>/dev/null || true)
    fi
    
    if [[ -n "$current_value" && "$FORCE_OVERWRITE" == "false" ]]; then
        echo "   [SKIP] Secret already exists."
        return
    fi
    
    # Generate new value
    local new_value=""
    case "$type" in
        "password") new_value=$(generate_password "$length") ;;
        "uuid")     new_value=$(generate_uuid) ;;
        "hex")      new_value=$(generate_hex "$length") ;;
        "static")   new_value="$static_value" ;;
        *)          log_error "Unknown type: $type"; exit 1 ;;
    esac
    
    log_warn "   [+] Generating new secret ($type)..."
    
    # Check if the secret path itself exists (to decide between put and patch)
    # We ignore the specific key check result from earlier, we need to know if the *path* has any data.
    local secret_exists=false
    if kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault kv get -format=json "$path" >/dev/null 2>&1; then
        secret_exists=true
    fi

    if $secret_exists; then
        # Use patch to append/update key without overwriting others
        log_info "   [.] Path exists, patching..."
        kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault kv patch "$path" "$key=$new_value"
    else
        # Use put to create the new secret
        log_info "   [.] Path does not exist, creating..."
        kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault kv put "$path" "$key=$new_value"
    fi
    
    echo "   [OK] Secret written."
}

# ------------------------------------------------------------------------------
# Main Execution
# ------------------------------------------------------------------------------

check_dependency "kubectl"
check_dependency "jq"
check_dependency "openssl"

log_info "Initializing secrets in Vault..."
check_vault_access

# ------------------------------------------------------------------------------
# SECRET DEFINITIONS
# ------------------------------------------------------------------------------
# Format: ensure_secret "PATH" "KEY" "TYPE" [LENGTH/VALUE]

log_info "--- Shared Infrastructure Secrets ---"
# Redis
ensure_secret "secret/shared/redis" "password" "password" 32
# RabbitMQ
ensure_secret "secret/shared/rabbitmq" "password" "password" 32
ensure_secret "secret/shared/rabbitmq" "erlang_cookie" "hex" 32

log_info "--- Auth Service Secrets ---"
# JWT Secrets
ensure_secret "secret/auth/jwt" "access_secret" "hex" 64
ensure_secret "secret/auth/jwt" "refresh_secret" "hex" 64
# OAuth (Placeholders for dev)
ensure_secret "secret/auth/oauth" "google_client_secret" "static" "dev-placeholder-secret"
ensure_secret "secret/auth/oauth" "42_client_secret" "static" "dev-placeholder-secret"

log_info "--- Matchmaking Service Secrets ---"
# (None yet, but prepared)
# ensure_secret "secret/matchmaking/config" "api_key" "password" 64

# ------------------------------------------------------------------------------
# Completion
# ------------------------------------------------------------------------------

log_info "Secrets population completed successfully."
