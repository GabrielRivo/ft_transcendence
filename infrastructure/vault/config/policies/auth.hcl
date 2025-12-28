# ==============================================================================
# POLITIQUE DE SÉCURITÉ : SERVICE AUTHENTIFICATION
# ==============================================================================
# DESCRIPTION :
#   Cette politique contrôle l'accès aux secrets pour le service d'authentification.
#   Le service auth nécessite des secrets spécifiques pour les providers OAuth
#   (GitHub, Discord) ainsi que des secrets cryptographiques.
#
# CONSOMMATEUR :
#   - Role Vault : auth-role
#   - ServiceAccount K8s : auth (namespace: default)
#
# USAGE :
#   Le Vault Agent Sidecar injecte ces secrets dans un fichier (ex: /vault/secrets/config)
#   qui est "sourcé" (. config) avant le démarrage du processus Node.js (Fastify).
# ==============================================================================

# Accès en lecture aux configurations applicatives partagées (JWT, etc.)
path "secret/data/app/common" {
  capabilities = ["read"]
}

# Accès en lecture aux secrets spécifiques au service auth
path "secret/data/app/auth" {
  capabilities = ["read"]
}
