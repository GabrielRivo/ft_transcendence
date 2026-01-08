#!/bin/bash
set -e

# Configuration
NAMESPACE="logging"
VAULT_NAMESPACE="vault"
ES_POD_LABEL="app=elasticsearch-master"
VAULT_POD_LABEL="app.kubernetes.io/name=vault"

# Vault Paths
VAULT_ES_PATH="secret/shared/elasticsearch"
VAULT_LS_PATH="secret/shared/logstash"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO] $1${NC}"; }
log_error() { echo -e "${RED}[ERROR] $1${NC}"; }
log_warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }

# Check dependencies
command -v kubectl >/dev/null 2>&1 || { log_error "kubectl required."; exit 1; }

log_info "Identifying Pods..."
ES_POD=$(kubectl get pod -n "$NAMESPACE" -l "$ES_POD_LABEL" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)
VAULT_POD=$(kubectl get pod -n "$VAULT_NAMESPACE" -l "$VAULT_POD_LABEL" -o jsonpath="{.items[0].metadata.name}" 2>/dev/null)

if [[ -z "$ES_POD" ]]; then log_error "Elasticsearch pod not found."; exit 1; fi
if [[ -z "$VAULT_POD" ]]; then log_error "Vault pod not found."; exit 1; fi

log_info "Waiting for Elasticsearch..."
kubectl wait --for=condition=Ready pod/"$ES_POD" -n "$NAMESPACE" --timeout=300s

# Retrieve Credentials from Vault
log_info "Retrieving credentials from Vault..."

# 1. Elastic Superuser Password (to create the user)
ELASTIC_PASSWORD=$(kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault kv get -field=password "$VAULT_ES_PATH")

# 2. Logstash User Password (to assign to the new user)
LOGSTASH_PASSWORD=$(kubectl exec -n "$VAULT_NAMESPACE" "$VAULT_POD" -- vault kv get -field=password "$VAULT_LS_PATH")

if [[ -z "$ELASTIC_PASSWORD" || -z "$LOGSTASH_PASSWORD" ]]; then
    log_error "Failed to retrieve passwords from Vault."
    exit 1
fi

# Create Role for Logstash Writer
log_info "Creating 'logstash_writer' role..."
ROLE_BODY='{
  "cluster": ["monitor", "manage_ilm", "manage_index_templates"],
  "indices": [
    {
      "names": ["logstash-*", "logs-*"],
      "privileges": ["write", "create", "create_index", "manage", "manage_ilm"]
    }
  ]
}'

HTTP_CODE=$(kubectl exec -n "$NAMESPACE" "$ES_POD" -- curl -s -o /dev/null -w "%{http_code}" -k -X POST \
    -u "elastic:$ELASTIC_PASSWORD" \
    -H "Content-Type: application/json" \
    -d "$ROLE_BODY" \
    "https://localhost:9200/_security/role/logstash_writer")

if [[ "$HTTP_CODE" != "200" && "$HTTP_CODE" != "201" ]]; then
    log_error "Failed to create role (HTTP $HTTP_CODE)."
    exit 1
fi
log_info "Role 'logstash_writer' created/updated."

# Create Logstash User
log_info "Creating/Updating 'logstash_internal' user..."
USER_BODY=$(cat <<EOF
{
  "password": "$LOGSTASH_PASSWORD",
  "roles": ["logstash_system", "logstash_writer"],
  "full_name": "Internal Logstash User",
  "email": "logstash@ft-transcendence.local"
}
EOF
)

HTTP_CODE=$(kubectl exec -n "$NAMESPACE" "$ES_POD" -- curl -s -o /dev/null -w "%{http_code}" -k -X POST \
    -u "elastic:$ELASTIC_PASSWORD" \
    -H "Content-Type: application/json" \
    -d "$USER_BODY" \
    "https://localhost:9200/_security/user/logstash_internal")

if [[ "$HTTP_CODE" != "200" && "$HTTP_CODE" != "201" ]]; then
    log_error "Failed to create user (HTTP $HTTP_CODE)."
    exit 1
fi

log_info "User 'logstash_internal' successfully configured."
