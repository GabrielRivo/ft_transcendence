#!/bin/bash
# ==============================================================================
# Vault Setup & Initialization Script
# ==============================================================================
#
# Context: ft_transcendence DevOps Module
#
# Purpose:
#   This script automates the complete initialization process of HashiCorp Vault
#   running in the Kubernetes cluster. It performs the following steps:
#   1. Waits for the Vault pod to be ready.
#   2. Initialises Vault (if not already initialized).
#   3. Unseals Vault automatically (using the generated keys).
#   4. Enables the KV v2 secret engine.
#   5. Applies Vault Policies defined in infrastructure/vault/policies/.
#   6. Configures Kubernetes Authentication Method via the helper script.
#
# Usage:
#   ./infrastructure/scripts/setup-vault.sh
#
# Dependencies:
#   - kubectl
#   - jq
#
# Output:
#   - Generates .vault-keys file containing the unseal key and root token.
#     (ensure this file is gitignored)
#
# ==============================================================================

set -e # Exit immediately if a command exits with a non-zero status

# ------------------------------------------------------------------------------
# Configuration & Variables
# ------------------------------------------------------------------------------

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")" # Go up two levels: infrastructure/scripts -> infrastructure -> root
VAULT_POLICIES_DIR="$PROJECT_ROOT/infrastructure/vault/policies"
VAULT_CONFIG_DIR="$PROJECT_ROOT/infrastructure/vault/config"
KEYS_FILE="$PROJECT_ROOT/.vault-keys"

# Kubernetes Details
VAULT_NAMESPACE="vault"
VAULT_POD="vault-0"

# ------------------------------------------------------------------------------
# Helper Functions
# ------------------------------------------------------------------------------

log_info() {
    echo -e "${GREEN}[INFO] $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

check_dependency() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed. Please install it to continue."
        exit 1
    fi
}

# ------------------------------------------------------------------------------
# Pre-flight Checks
# ------------------------------------------------------------------------------

check_dependency "kubectl"
check_dependency "jq"

log_info "Starting Vault setup process..."

# ------------------------------------------------------------------------------
# 1. Wait for Vault Pod to be Ready
# ------------------------------------------------------------------------------

log_info "Waiting for Vault pod ($VAULT_POD) to be ready in namespace '$VAULT_NAMESPACE'..."

# Loop until the pod is Running
while [[ $(kubectl get pod "$VAULT_POD" -n "$VAULT_NAMESPACE" -o 'jsonpath={.status.phase}') != "Running" ]]; do
    echo -n "."
    sleep 2
done

echo ""
log_info "Vault pod is Running. Waiting for container to be ready for exec..."
sleep 5

# We don't wait for "Ready" condition because Vault is not Ready until Unsealed.
# Instead, we check if we can execute a command.
while ! kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault status >/dev/null 2>&1; do
    # vault status returns non-zero when sealed/uninitialized, which is fine, 
    # but if exec fails (connection refused), we wait.
    # Actually, let's just check if we can run 'true' inside.
    if kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- true 2>/dev/null; then
        break
    fi
    echo -n "."
    sleep 2
done

echo ""
log_info "Vault container is accessible."

# ------------------------------------------------------------------------------
# 2. Check Vault Status & Initialize
# ------------------------------------------------------------------------------

log_info "Checking Vault initialization status..."

# Get Vault status in JSON format
VAULT_STATUS=$(kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault status -format=json 2>/dev/null || true)

# If the command fails (e.g., Vault is sealed and returns error code 2), we can still parse the output if it's valid JSON
# or we assume uninitialized if status command behaves unexpectedly, but usually 'vault status' returns valid JSON even if sealed.
# However, `vault status` returns exit code 2 if sealed, 0 if unsealed. We need to handle this.

# Extract 'initialized' field
IS_INITIALIZED=$(echo "$VAULT_STATUS" | jq -r '.initialized')

if [[ "$IS_INITIALIZED" == "true" ]]; then
    log_info "Vault is already initialized."
else
    log_info "Vault is NOT initialized. Initializing now..."
    
    # Initialize Vault with 1 key share and 1 key threshold (for development simplicity)
    # Warning: In production, use higher threshold (e.g., 3 key shares, 2 threshold)
    INIT_OUTPUT=$(kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault operator init -key-shares=1 -key-threshold=1 -format=json)
    
    # Save output to keys file
    echo "$INIT_OUTPUT" > "$KEYS_FILE"
    chmod 600 "$KEYS_FILE"
    
    log_info "Vault initialized successfully."
    log_warn "Unseal keys and Root Token saved to: $KEYS_FILE"
    log_warn "DO NOT COMMIT THIS FILE TO GIT!"
fi

# ------------------------------------------------------------------------------
# 3. Unseal Vault
# ------------------------------------------------------------------------------

# Read status again
VAULT_STATUS=$(kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault status -format=json 2>/dev/null || true)
IS_SEALED=$(echo "$VAULT_STATUS" | jq -r '.sealed')

if [[ "$IS_SEALED" == "true" ]]; then
    log_info "Vault is sealed. Attempting to unseal..."
    
    if [[ ! -f "$KEYS_FILE" ]]; then
        log_error "Vault is sealed but keys file ($KEYS_FILE) not found. Cannot unseal automatically."
        exit 1
    fi
    
    # Extract unseal key
    UNSEAL_KEY=$(jq -r '.unseal_keys_b64[0]' "$KEYS_FILE")
    
    if [[ -z "$UNSEAL_KEY" || "$UNSEAL_KEY" == "null" ]]; then
        log_error "Could not extract unseal key from $KEYS_FILE."
        exit 1
    fi
    
    # Execute unseal command
    kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault operator unseal "$UNSEAL_KEY"
    log_info "Vault unsealed successfully."
else
    log_info "Vault is already unsealed."
fi

# ------------------------------------------------------------------------------
# 4. Login to Vault
# ------------------------------------------------------------------------------

log_info "Logging in as Root..."

if [[ ! -f "$KEYS_FILE" ]]; then
    log_error "Keys file not found. Cannot login."
    exit 1
fi

ROOT_TOKEN=$(jq -r '.root_token' "$KEYS_FILE")

if [[ -z "$ROOT_TOKEN" || "$ROOT_TOKEN" == "null" ]]; then
    log_error "Could not extract root token from $KEYS_FILE."
    exit 1
fi

kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault login "$ROOT_TOKEN" > /dev/null
log_info "Logged in successfully."

# ------------------------------------------------------------------------------
# 5. Enable KV v2 Secret Engine
# ------------------------------------------------------------------------------

log_info "Enabling 'secret' KV v2 engine..."

# Check if already enabled to avoid error
ENGINES=$(kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault secrets list -format=json)
if echo "$ENGINES" | jq -e '."secret/"' > /dev/null; then
    log_info "KV v2 engine 'secret/' is already enabled."
else
    kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault secrets enable -path=secret kv-v2
    log_info "KV v2 engine enabled."
fi

# ------------------------------------------------------------------------------
# 6. Apply Policies
# ------------------------------------------------------------------------------

log_info "Applying Vault policies from $VAULT_POLICIES_DIR..."

if [[ -d "$VAULT_POLICIES_DIR" ]]; then
    for policy_file in "$VAULT_POLICIES_DIR"/*.hcl; do
        if [[ -f "$policy_file" ]]; then
            policy_name=$(basename "$policy_file" .hcl)
            log_info "Applying policy: $policy_name"
            
            # Pipe the policy content directly to kubectl exec
            cat "$policy_file" | kubectl exec -i -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault policy write "$policy_name" -
        fi
    done
else
    log_warn "Policy directory not found: $VAULT_POLICIES_DIR"
fi

# ------------------------------------------------------------------------------
# 7. Configure Kubernetes Auth Method
# ------------------------------------------------------------------------------

log_info "Configuring Kubernetes Auth Method..."

K8S_AUTH_SCRIPT="$VAULT_CONFIG_DIR/kubernetes-auth.sh"
REMOTE_SCRIPT_PATH="/tmp/kubernetes-auth.sh"

if [[ -f "$K8S_AUTH_SCRIPT" ]]; then
    # Pipe the script content directly to sh inside the pod
    # This avoids issues with kubectl cp, permissions, and file paths
    cat "$K8S_AUTH_SCRIPT" | kubectl exec -i -n "$VAULT_NAMESPACE" "$VAULT_POD" -- /bin/sh
    
    log_info "Kubernetes Auth configuration completed."
else
    log_error "Kubernetes auth script not found: $K8S_AUTH_SCRIPT"
    exit 1
fi

# ------------------------------------------------------------------------------
# Completion
# ------------------------------------------------------------------------------

log_info "Vault setup completed successfully!"
log_info "You can now access Vault UI at http://localhost:8200 (requires port-forwarding)"
log_info "Command: kubectl port-forward -n $VAULT_NAMESPACE $VAULT_POD 8200:8200"
