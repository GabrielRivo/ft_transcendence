# Infrastructure Kubernetes - ft_transcendence

Cette structure utilise [Kustomize](https://kustomize.io/) pour gérer les configurations Kubernetes multi-environnements.

## Structure

```
k8s/
├── base/                    # Manifests de base (réutilisables)
│   ├── infrastructure/      # Services d'infrastructure
│   │   ├── vault/
│   │   ├── nginx/
│   │   ├── rabbitmq/
│   │   ├── redis/
│   │   ├── storage/
│   │   ├── elk/
│   │   └── monitoring/
│   └── applications/         # Services applicatifs
│       ├── frontend/
│       ├── auth/
│       └── matchmaking/
├── overlays/                # Configurations spécifiques par environnement
│   ├── dev/                 # Environnement de développement
│   ├── test/                # Environnement de test/staging
│   └── production/          # Environnement de production
└── scripts/                 # Scripts utilitaires
```

## Conventions

### Namespaces

Les namespaces suivent la convention `ft-transcendence-{env}` :
- `ft-transcendence-dev` : Développement
- `ft-transcendence-test` : Tests et staging
- `ft-transcendence-production` : Production

### Utilisation

Pour déployer un environnement :

```bash
# Développement
kubectl apply -k overlays/dev

# Test
kubectl apply -k overlays/test

# Production
kubectl apply -k overlays/production
```

Pour voir les ressources qui seront créées :

```bash
kubectl kustomize overlays/dev
```

## Documentation

Voir [infrastructure/docs/00_roadmap.md](../docs/00_roadmap.md) pour la roadmap complète.
