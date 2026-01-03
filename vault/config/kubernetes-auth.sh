#!/bin/bash
# Kubernetes Auth Method Configuration Script
# Context: ft-transcendence DevOps Module
# Purpose: Configures Vault to trust the Kubernetes Cluster for authentication.
#          It enables the auth method, configures the connection to the K8s API,
#          and defines roles linking K8s ServiceAccounts to Vault Policies.

set -e # Exit immediately if a command exits with a non-zero status.

echo "[*] Configuring Kubernetes Auth Method..."

# ------------------------------------------------------------------------------
# 1. Enable Kubernetes Auth Method
# ------------------------------------------------------------------------------
# We check if the auth method is already enabled to make the script idempotent.
# If it's already enabled, we proceed to configuration update.
if vault auth list | grep -q "kubernetes/"; then
    echo "[-] Kubernetes auth already enabled."
else
    echo "[+] Enabling Kubernetes auth method..."
    vault auth enable kubernetes
fi

# ------------------------------------------------------------------------------
# 2. Configure Vault to talk to Kubernetes API
# ------------------------------------------------------------------------------
# Vault needs to verify the JWT tokens sent by pods. To do this, it needs to
# call the TokenReview API of Kubernetes.

echo "[*] Configuring Kubernetes connection..."

# When running inside a Pod, the ServiceAccount token and CA are mounted here:
SA_PATH="/var/run/secrets/kubernetes.io/serviceaccount"
K8S_HOST="https://kubernetes.default.svc"
K8S_CA_CERT="$SA_PATH/ca.crt"
# Note: In Vault 1.9+, `disable_local_ca_jwt=false` (default) allows Vault to use its own token automatically.
# However, explicit configuration is often more reliable in dev environments.

vault write auth/kubernetes/config \
    kubernetes_host="$K8S_HOST" \
    kubernetes_ca_cert=@"$K8S_CA_CERT" \
    disable_iss_validation=true

echo "[+] Kubernetes auth configuration applied."

# ------------------------------------------------------------------------------
# 3. Create Roles
# ------------------------------------------------------------------------------
# A Vault Role maps a Kubernetes ServiceAccount (in a Namespace) to a set of Vault Policies.

# Role: auth-role
# Maps the 'auth-sa' ServiceAccount in 'production' namespace to 'auth-policy' and 'shared-policy'.
echo "[*] Creating role: auth-role..."
vault write auth/kubernetes/role/auth-role \
    bound_service_account_names=auth-sa \
    bound_service_account_namespaces=production \
    policies=auth-policy,shared-policy \
    ttl=1h

# Role: matchmaking-role
# Maps the 'matchmaking-sa' ServiceAccount in 'production' namespace to 'matchmaking-policy' and 'shared-policy'.
echo "[*] Creating role: matchmaking-role..."
vault write auth/kubernetes/role/matchmaking-role \
    bound_service_account_names=matchmaking-sa \
    bound_service_account_namespaces=production \
    policies=matchmaking-policy,shared-policy \
    ttl=1h

echo "[SUCCESS] Kubernetes Auth Method configured successfully."
