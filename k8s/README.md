# Kubernetes Manifests

Ce répertoire contient les manifestes Kubernetes organisés selon l'approche **Kustomize**.

## Structure

```
k8s/
├── base/                   # Ressources de base communes
│   ├── namespaces.yaml     # Définition des namespaces
│   ├── storage-class.yaml  # Configuration du stockage
│   └── ...
└── overlays/               # Surcharges par environnement
    ├── dev/                # Environnement de développement
    ├── test/               # Environnement de test
    └── production/         # Environnement de production
```

## Utilisation

Pour déployer un environnement spécifique :

```bash
# Déployer l'environnement dev
kubectl apply -k overlays/dev

# Déployer l'environnement production
kubectl apply -k overlays/production
```

## Conventions

- Tous les manifestes doivent être déclaratifs.
- Utiliser des noms de fichiers explicites (ex: `auth-service.yaml`).
- Les ressources doivent définir des `resources.requests` et `resources.limits`.
