# Helm Charts & Values

Ce répertoire gère les déploiements via Helm, incluant les charts tiers (Vault, ELK, etc.) et les charts personnalisés.

## Structure

```
helm/
├── values/                 # Fichiers de configuration (Values)
│   ├── vault-values.yaml
│   ├── elasticsearch-values.yaml
│   └── ...
└── charts/                 # Charts personnalisés
    └── microservice/       # Chart générique pour les applications
```

## Chart Microservice

Le chart `microservice` est un template générique utilisé pour déployer `auth-service`, `matchmaking-service`, et `frontend`. Il standardise :

- Les Deployments / StatefulSets
- Les Services & Ingress
- Les ConfigMaps & Secrets (via External Secrets)
- Les sondes (Liveness/Readiness probes)

## Utilisation

Pour installer un chart avec des valeurs spécifiques :

```bash
helm install vault hashicorp/vault -f values/vault-values.yaml -n vault
```
