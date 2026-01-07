#!/bin/bash
# Script: generate-elk-certs.sh
# Description: Generates self-signed TLS certificates for the ELK Stack (Elasticsearch, Kibana, Logstash)
#              and creates Kubernetes Secrets.
#
# Usage: ./generate-elk-certs.sh [certs_output_dir]
#
# Prerequisites:
# - openssl installed
# - kubectl installed and configured
# - Namespace 'logging' (or defined via NAMESPACE env var)
#
# Structure:
# - Root CA generation
# - Elasticsearch Certificate (Node & HTTP)
# - Kibana Certificate
# - Logstash Certificate
# - Kubernetes Secrets creation (standardized keys: tls.key, tls.crt, ca.crt)

set -e

# Configuration
NAMESPACE="${NAMESPACE:-logging}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
# Default certs dir to /tmp/elk-certs to avoid polluting the repo, or use provided arg
CERTS_DIR="${1:-/tmp/elk-certs}"
CONFIGS_DIR="$INFRA_ROOT/infrastructure/tls/configs"
VALIDITY_DAYS=365

# Logging helpers
log_info() { echo -e "\033[1;34m[INFO]\033[0m $1"; }
log_warn() { echo -e "\033[1;33m[WARN]\033[0m $1"; }
log_success() { echo -e "\033[1;32m[SUCCESS]\033[0m $1"; }
log_error() { echo -e "\033[1;31m[ERROR]\033[0m $1"; }

# Ensure configs exist
if [[ ! -d "$CONFIGS_DIR" ]]; then
    log_error "Configuration directory not found: $CONFIGS_DIR"
    exit 1
fi

log_info "Generating ELK TLS certificates in: $CERTS_DIR"
mkdir -p "$CERTS_DIR"

# ------------------------------------------------------------------------------
# 1. Generate CA (Certificate Authority)
# ------------------------------------------------------------------------------
if [[ -f "$CERTS_DIR/ca.crt" && -f "$CERTS_DIR/ca.key" ]]; then
    log_info "CA already exists, skipping generation."
else
    log_info "Generating CA..."
    openssl req -new -x509 -nodes -days "$VALIDITY_DAYS" \
        -subj "/CN=ELK-Stack-CA/O=ft-transcendence" \
        -keyout "$CERTS_DIR/ca.key" \
        -out "$CERTS_DIR/ca.crt"
fi

# ------------------------------------------------------------------------------
# 2. Generate Elasticsearch Certificate
# ------------------------------------------------------------------------------
log_info "Generating Elasticsearch certificate..."
# Generate private key
openssl genrsa -out "$CERTS_DIR/elasticsearch.key" 4096

# Generate CSR using external config
openssl req -new -key "$CERTS_DIR/elasticsearch.key" \
    -out "$CERTS_DIR/elasticsearch.csr" \
    -config "$CONFIGS_DIR/elasticsearch-openssl.cnf"

# Sign certificate with CA
openssl x509 -req -in "$CERTS_DIR/elasticsearch.csr" \
    -CA "$CERTS_DIR/ca.crt" -CAkey "$CERTS_DIR/ca.key" -CAcreateserial \
    -out "$CERTS_DIR/elasticsearch.crt" -days "$VALIDITY_DAYS" \
    -extensions req_ext \
    -extfile "$CONFIGS_DIR/elasticsearch-openssl.cnf"

# ------------------------------------------------------------------------------
# 3. Generate Kibana Certificate
# ------------------------------------------------------------------------------
log_info "Generating Kibana certificate..."
openssl genrsa -out "$CERTS_DIR/kibana.key" 4096

openssl req -new -key "$CERTS_DIR/kibana.key" \
    -out "$CERTS_DIR/kibana.csr" \
    -config "$CONFIGS_DIR/kibana-openssl.cnf"

openssl x509 -req -in "$CERTS_DIR/kibana.csr" \
    -CA "$CERTS_DIR/ca.crt" -CAkey "$CERTS_DIR/ca.key" -CAcreateserial \
    -out "$CERTS_DIR/kibana.crt" -days "$VALIDITY_DAYS" \
    -extensions req_ext \
    -extfile "$CONFIGS_DIR/kibana-openssl.cnf"

# ------------------------------------------------------------------------------
# 4. Generate Logstash Certificate
# ------------------------------------------------------------------------------
log_info "Generating Logstash certificate..."
openssl genrsa -out "$CERTS_DIR/logstash.key" 4096

openssl req -new -key "$CERTS_DIR/logstash.key" \
    -out "$CERTS_DIR/logstash.csr" \
    -config "$CONFIGS_DIR/logstash-openssl.cnf"

openssl x509 -req -in "$CERTS_DIR/logstash.csr" \
    -CA "$CERTS_DIR/ca.crt" -CAkey "$CERTS_DIR/ca.key" -CAcreateserial \
    -out "$CERTS_DIR/logstash.crt" -days "$VALIDITY_DAYS" \
    -extensions req_ext \
    -extfile "$CONFIGS_DIR/logstash-openssl.cnf"


# ------------------------------------------------------------------------------
# 5. Create Kubernetes Secrets
# ------------------------------------------------------------------------------
# We create separate secrets for each component to match Helm charts expectations
# (standard keys: tls.key, tls.crt, ca.crt)

log_info "Creating Kubernetes secrets..."

# Ensure namespace exists
if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
    log_warn "Namespace '$NAMESPACE' does not exist. Creating it..."
    kubectl create namespace "$NAMESPACE"
fi

# Elasticsearch Secret
# Expected by chart at: elasticsearch-master-certs (default name)
# Keys must be tls.key, tls.crt, ca.crt to be auto-discovered by the chart
log_info "Creating/Updating 'elasticsearch-master-certs'..."
# Delete first to allow type change if needed (Opaque -> kubernetes.io/tls)
kubectl delete secret elasticsearch-master-certs -n "$NAMESPACE" --ignore-not-found
kubectl create secret generic elasticsearch-master-certs \
    --type=kubernetes.io/tls \
    --from-file=tls.key="$CERTS_DIR/elasticsearch.key" \
    --from-file=tls.crt="$CERTS_DIR/elasticsearch.crt" \
    --from-file=ca.crt="$CERTS_DIR/ca.crt" \
    --namespace="$NAMESPACE" \
    --dry-run=client -o yaml | kubectl apply -f -

# Add Helm metadata so Helm adopts the secret instead of failing
kubectl label secret elasticsearch-master-certs -n "$NAMESPACE" --overwrite \
    app.kubernetes.io/managed-by=Helm
kubectl annotate secret elasticsearch-master-certs -n "$NAMESPACE" --overwrite \
    meta.helm.sh/release-name=elasticsearch \
    meta.helm.sh/release-namespace="$NAMESPACE"

# Kibana Secret
# We'll name it kibana-certs
log_info "Creating/Updating 'kibana-certs'..."
kubectl delete secret kibana-certs -n "$NAMESPACE" --ignore-not-found
kubectl create secret generic kibana-certs \
    --type=kubernetes.io/tls \
    --from-file=tls.key="$CERTS_DIR/kibana.key" \
    --from-file=tls.crt="$CERTS_DIR/kibana.crt" \
    --from-file=ca.crt="$CERTS_DIR/ca.crt" \
    --namespace="$NAMESPACE" \
    --dry-run=client -o yaml | kubectl apply -f -

# Add Helm metadata (anticipating release name 'kibana')
kubectl label secret kibana-certs -n "$NAMESPACE" --overwrite \
    app.kubernetes.io/managed-by=Helm
kubectl annotate secret kibana-certs -n "$NAMESPACE" --overwrite \
    meta.helm.sh/release-name=kibana \
    meta.helm.sh/release-namespace="$NAMESPACE"

# Logstash Secret
# We'll name it logstash-certs
log_info "Creating/Updating 'logstash-certs'..."
kubectl delete secret logstash-certs -n "$NAMESPACE" --ignore-not-found
kubectl create secret generic logstash-certs \
    --type=kubernetes.io/tls \
    --from-file=tls.key="$CERTS_DIR/logstash.key" \
    --from-file=tls.crt="$CERTS_DIR/logstash.crt" \
    --from-file=ca.crt="$CERTS_DIR/ca.crt" \
    --namespace="$NAMESPACE" \
    --dry-run=client -o yaml | kubectl apply -f -

# Add Helm metadata (anticipating release name 'logstash')
kubectl label secret logstash-certs -n "$NAMESPACE" --overwrite \
    app.kubernetes.io/managed-by=Helm
kubectl annotate secret logstash-certs -n "$NAMESPACE" --overwrite \
    meta.helm.sh/release-name=logstash \
    meta.helm.sh/release-namespace="$NAMESPACE"

# Shared CA Secret (for clients/testing)
log_info "Creating/Updating 'elk-ca-cert'..."
kubectl create secret generic elk-ca-cert \
    --from-file=ca.crt="$CERTS_DIR/ca.crt" \
    --namespace="$NAMESPACE" \
    --dry-run=client -o yaml | kubectl apply -f -

log_success "All secrets created successfully!"
