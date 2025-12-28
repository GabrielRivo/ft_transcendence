# ==============================================================================
# POLITIQUE DE SÉCURITÉ : SERVICE MATCHMAKING
# ==============================================================================
# DESCRIPTION :
#   Cette politique contrôle l'accès aux secrets pour le service de matchmaking.
#   Le service matchmaking nécessite des secrets pour la connexion RabbitMQ
#   et d'autres configurations spécifiques.
#
# CONSOMMATEUR :
#   - Role Vault : matchmaking-role
#   - ServiceAccount K8s : matchmaking (namespace: default)
#
# USAGE :
#   Le Vault Agent Sidecar injecte ces secrets dans un fichier (ex: /vault/secrets/config)
#   qui est "sourcé" (. config) avant le démarrage du processus Node.js (Fastify).
# ==============================================================================

# Accès en lecture aux configurations applicatives partagées (JWT, etc.)
path "secret/data/app/common" {
  capabilities = ["read"]
}

# Accès en lecture aux secrets spécifiques au service matchmaking
path "secret/data/app/matchmaking" {
  capabilities = ["read"]
}

# Accès en lecture aux secrets RabbitMQ pour le bus d'événements
path "secret/data/infra/rabbitmq" {
  capabilities = ["read"]
}
