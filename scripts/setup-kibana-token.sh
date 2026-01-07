#!/bin/bash
set -e

# Configuration
NAMESPACE="logging"
VAULT_NAMESPACE="vault"
ES_POD_LABEL="app=elasticsearch-master"
VAULT_POD_LABEL="app.kubernetes.io/name=vault"
VAULT_PATH="secret/shared/kibana"
VAULT_KEY="service_token"
# Updated Secret Name to match Elastic Chart defaults
SECRET_NAME="kibana-kibana-es-token"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO] $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

# 1. Check dependencies
command -v kubectl >/dev/null 2>&1 || { log_error "kubectl is required but not installed. Aborting."; exit 1; }

# 2. Identify Pods
log_info "Identifying Pods..."
ES_POD=$(kubectl get pod -n "$NAMESPACE" -l "$ES_POD_LABEL" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
VAULT_POD=$(kubectl get pod -n "$VAULT_NAMESPACE" -l "$VAULT_POD_LABEL" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)

if [[ -z "$ES_POD" ]]; then
    log_error "Elasticsearch pod not found in namespace $NAMESPACE"
    exit 1
fi

if [[ -z "$VAULT_POD" ]]; then
    log_error "Vault pod not found in namespace $VAULT_NAMESPACE"
    exit 1
fi

# 3. Wait for Elasticsearch to be Ready
log_info "Waiting for Elasticsearch to be ready..."
kubectl wait --for=condition=Ready pod/"$ES_POD" -n "$NAMESPACE" --timeout=300s

# 4. Check Vault status and Existing Token
log_info "Checking Vault status..."
EXISTING_TOKEN=$(kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault kv get -field="$VAULT_KEY" "$VAULT_PATH" 2>/dev/null || true)

TOKEN_VALID=false

if [[ -n "$EXISTING_TOKEN" ]]; then
    log_info "Token found in Vault. Verifying validity against Elasticsearch..."
    
    # Verify token validity by calling ES API
    # We use the token to hit the authenticate endpoint
    HTTP_CODE=$(kubectl exec -n "$NAMESPACE" "$ES_POD" -- curl -s -o /dev/null -w "%{http_code}" -k \
        -H "Authorization: Bearer $EXISTING_TOKEN" \
        "https://localhost:9200/_security/_authenticate")
    
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_info "Existing token is VALID. Skipping generation."
        TOKEN_VALID=true
        exit 0
    else
        log_warn "Existing token is INVALID (HTTP $HTTP_CODE). It will be regenerated."
    fi
fi

if [[ "$TOKEN_VALID" == "false" ]]; then
    log_info "Generating new Service Token from Elasticsearch..."

    # Cleanup old token in ES if it exists (ignore error)
    kubectl exec -n "$NAMESPACE" "$ES_POD" -- bin/elasticsearch-service-tokens delete elastic/kibana kibana-token >/dev/null 2>&1 || true
    
    # Create new token
    NEW_TOKEN_LINE=$(kubectl exec -n "$NAMESPACE" "$ES_POD" -- bin/elasticsearch-service-tokens create elastic/kibana kibana-token)
    # Extract token value (format: "service_token <name> <value>")
    TOKEN=$(echo "$NEW_TOKEN_LINE" | awk '{print $4}')

    if [[ -z "$TOKEN" ]]; then
        log_error "Failed to generate token. Output: $NEW_TOKEN_LINE"
        exit 1
    fi

    log_info "Storing new token in Vault..."
    
    if kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault kv get "$VAULT_PATH" >/dev/null 2>&1; then
        kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault kv patch "$VAULT_PATH" "$VAULT_KEY=$TOKEN"
    else
        log_warn "Vault secret $VAULT_PATH does not exist. Creating it."
        kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault kv put "$VAULT_PATH" "$VAULT_KEY=$TOKEN"
    fi

    log_info "Token successfully stored in Vault."

    # Force sync with Kubernetes Secret
    log_info "Forcing External Secrets Operator synchronization..."
    kubectl delete secret "$SECRET_NAME" -n "$NAMESPACE" --ignore-not-found
    
    log_info "Waiting for Secret to be recreated by ESO..."
    for i in {1..30}; do
        if kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" >/dev/null 2>&1; then
            log_info "Secret '$SECRET_NAME' successfully recreated."
            break
        fi
        sleep 2
    done
fi
