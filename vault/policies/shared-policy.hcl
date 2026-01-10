# Vault Policy for Shared Resources
# Context: ft-transcendence Microservices Architecture
# Usage: Assigned to ALL microservices that need access to common infrastructure.

# ------------------------------------------------------------------------------
# 1. Shared Infrastructure Secrets
# ------------------------------------------------------------------------------
# Allow services to read credentials for shared infrastructure components.
# Typical secrets included here:
# - Redis credentials (host, port, password)
# - RabbitMQ credentials (connection string, user, pass)
# - Database public connection info
#
# Path format: secret/data/shared/<resource>
# The '*' wildcard matches any sub-path (e.g., 'redis', 'rabbitmq').
# All environments (dev, production) share the same secrets for infrastructure services.
path "secret/data/shared/*" {
  capabilities = ["read"]
}

# Allow listing metadata for shared secrets.
path "secret/metadata/shared/*" {
  capabilities = ["list"]
}
