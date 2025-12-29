# Redis - Configuration Kubernetes

Ce dossier contient les manifests Kubernetes pour déployer Redis dans le cluster.

## Structure

- `statefulset.yaml` : StatefulSet pour Redis avec persistance
- `service.yaml` : Services ClusterIP (normal et headless)
- `redis.conf` : Fichier de configuration Redis de base
- `secret.yaml` : Secret pour le mot de passe Redis (optionnel)
- `kustomization.yaml` : Configuration Kustomize avec configMapGenerator

**Note** : La configuration Redis est stockée dans un fichier séparé (`redis.conf`) et chargée via `configMapGenerator` de Kustomize. Chaque overlay (dev, test, production) a son propre fichier `redis.conf` qui surcharge la configuration de base.

## Accès depuis les Services Applicatifs

### Connexion depuis un Pod dans le même namespace

```typescript
// URL de connexion Redis
const redisUrl = 'redis://redis:6379';

// Si un mot de passe est configuré
const redisUrl = `redis://:${process.env.REDIS_PASSWORD}@redis:6379`;
```

### Variables d'environnement

Les services applicatifs peuvent utiliser les variables d'environnement suivantes :

```yaml
env:
  - name: REDIS_HOST
    value: redis
  - name: REDIS_PORT
    value: '6379'
  - name: REDIS_PASSWORD
    valueFrom:
      secretKeyRef:
        name: redis-secret
        key: password
        optional: true
```

### DNS Kubernetes

- **Service ClusterIP** : `redis.<namespace>.svc.cluster.local` ou simplement `redis`
- **Service Headless** (pour StatefulSet) : `redis-headless.<namespace>.svc.cluster.local`
- **Pod individuel** (pour StatefulSet) : `redis-0.redis-headless.<namespace>.svc.cluster.local`

### Exemple de connexion depuis Node.js

```typescript
import { createClient } from 'redis';

const client = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

await client.connect();
```

## Configuration par Environnement

### Dev

- **Replicas** : 1
- **Ressources** : 128Mi mémoire, 100m CPU (requests) / 256Mi mémoire, 200m CPU (limits)
- **Stockage** : 5Gi avec StorageClass `local-path`
- **Persistance** : AOF désactivé pour performance

### Test

- **Replicas** : 3
- **Ressources** : 256Mi mémoire, 250m CPU (requests) / 512Mi mémoire, 500m CPU (limits)
- **Stockage** : 20Gi avec StorageClass `standard`
- **Persistance** : AOF activé avec fsync `everysec`
- **PodAntiAffinity** : Préférence pour distribuer les pods sur différents nodes

### Production

- **Replicas** : 3
- **Ressources** : 512Mi mémoire, 500m CPU (requests) / 1Gi mémoire, 1000m CPU (limits)
- **Stockage** : 50Gi avec StorageClass `fast-ssd`
- **Persistance** : AOF activé avec fsync `always`
- **PodAntiAffinity** : Requis pour distribuer les pods sur différents nodes
- **PodDisruptionBudget** : Minimum 2 pods disponibles

## Health Checks

Redis expose deux probes :

- **Liveness Probe** : Vérifie que Redis répond aux commandes (`redis-cli ping`)

  - Délai initial : 30 secondes
  - Période : 10 secondes
  - Timeout : 5 secondes
  - Seuil d'échec : 3

- **Readiness Probe** : Vérifie que Redis est prêt à accepter des connexions
  - Délai initial : 10 secondes
  - Période : 5 secondes
  - Timeout : 3 secondes
  - Seuil d'échec : 3

## Sécurité

- **SecurityContext** : Exécution en mode non-root (UID 999)
- **Capabilities** : Toutes les capabilities Linux sont supprimées sauf celles nécessaires
- **Protected Mode** : Activé en test et production
- **Commandes dangereuses** : Désactivées en production (FLUSHDB, FLUSHALL, CONFIG, etc.)

## Persistance

Les données Redis sont persistées dans un PersistentVolume créé via `volumeClaimTemplates` :

- **Chemin de données** : `/data`
- **Fichiers** :
  - `dump.rdb` : Snapshot RDB
  - `appendonly.aof` : Fichier AOF (selon la configuration)

## Mise à jour

Le StatefulSet utilise une stratégie de mise à jour `RollingUpdate` :

- Les pods sont mis à jour un par un
- La partition est définie à 0 pour permettre la mise à jour de tous les pods

## Troubleshooting

### Vérifier l'état des pods

```bash
kubectl get pods -n ft-transcendence-dev -l app=redis
```

### Voir les logs

```bash
kubectl logs -n ft-transcendence-dev redis-0
```

### Se connecter à Redis depuis un pod

```bash
kubectl exec -it -n ft-transcendence-dev redis-0 -- redis-cli
```

### Vérifier la configuration

```bash
# Voir le ConfigMap généré
kubectl get configmap -n ft-transcendence-dev redis-config -o yaml

# Voir le contenu du fichier de configuration
kubectl get configmap -n ft-transcendence-dev redis-config -o jsonpath='{.data.redis\.conf}'
```

### Gestion des Secrets par Environnement

Les secrets Redis sont gérés séparément pour chaque environnement :

- **Dev** : `overlays/dev/redis-secret.yaml` - Mot de passe vide (développement)
- **Test** : `overlays/test/redis-secret.yaml` - Mot de passe vide (structure prête pour Vault)
- **Production** : `overlays/production/redis-secret.yaml` - Mot de passe vide (DOIT être configuré via Vault)

**Important** : Pour la production, le mot de passe doit être injecté via Vault ou External Secrets Operator. Ne jamais commiter de mot de passe réel dans Git.

### Vérifier les volumes persistants

```bash
kubectl get pvc -n ft-transcendence-dev -l app=redis
```
