# Roadmap Infrastructure Kubernetes - ft_transcendence

## Vue d'Ensemble

Cette roadmap détaille la stratégie de migration de l'infrastructure Docker Compose vers Kubernetes pour le projet ft_transcendence. L'objectif est de déployer tous les services d'infrastructure et applicatifs dans un cluster Kubernetes avec support multi-environnements (dev, test, prod).

---

## Objectifs Principaux

1. **Migration vers Kubernetes** : Remplacer Docker Compose par Kubernetes pour une meilleure scalabilité et résilience
2. **Services d'Infrastructure** : Déployer Vault, Nginx, RabbitMQ, Redis, Storage SQLite, Stack ELK, Prometheus & Grafana
3. **Services Applicatifs** : Déployer les services backend (auth, matchmaking) et le frontend
4. **Packages d'Intégration** : Développer des packages réutilisables pour l'intégration avec les services d'infrastructure
5. **Multi-Environnements** : Support complet pour dev, test, et prod avec configurations adaptées
6. **Makefile Unifié** : Une seule commande pour démarrer/arrêter/nettoyer selon l'environnement

---

## Architecture Cible

```
┌─────────────────────────────────────────────────────────────┐
│                    Ingress (Nginx + WAF)                    │
│                    + Cloudflare (Prod)                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│   Frontend   │ │   Auth      │ │ Matchmaking │
│   (React)    │ │   Service   │ │   Service   │
└──────────────┘ └─────────────┘ └─────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│   RabbitMQ   │ │    Redis    │ │   SQLite    │
│              │ │              │ │   Storage   │
└──────────────┘ └─────────────┘ └─────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│    Vault     │ │   ELK Stack │ │ Prometheus  │
│              │ │             │ │  & Grafana  │
└──────────────┘ └─────────────┘ └─────────────┘
```

---

## Phases de Développement

### Phase 1 : Fondations et Structure (Semaine 1-2)

**Objectif** : Mettre en place la structure de base et les outils nécessaires

#### 1.1 Structure des Manifests Kubernetes

- [x] Créer la structure de dossiers avec Kustomize

  ```
  infrastructure/k8s/
  ├── base/                    # Manifests de base
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
  ├── overlays/
  │   ├── dev/
  │   ├── test/
  │   └── production/
  └── scripts/                  # Scripts utilitaires
  ```

- [x] Configurer Kustomize pour la gestion multi-environnements
- [x] Créer les fichiers `kustomization.yaml` de base pour chaque composant
- [x] Documenter la structure et les conventions de nommage

#### 1.2 Configuration des Namespaces

- [x] Créer les namespaces pour chaque environnement avec préfixe application
  - `ft-transcendence-dev` : Développement
  - `ft-transcendence-test` : Tests et staging
  - `ft-transcendence-production` : Production
- [x] Configurer les ResourceQuotas par environnement
- [x] Configurer les LimitRanges par environnement
- [x] Appliquer les PodSecurityStandards appropriés (`baseline` pour dev, `restricted` pour test/prod)
- [x] Documenter la convention de nommage des namespaces (préfixe `ft-transcendence-` pour éviter les conflits multi-projets)

#### 1.3 Configuration des Secrets et ConfigMaps

- [x] Créer la structure pour les secrets (via Vault)
- [x] Configurer les ConfigMaps pour les configurations non-sensibles
- [x] Documenter la gestion des secrets par environnement

#### 1.4 Mise à jour du Makefile

- [x] Ajouter les commandes Kubernetes de base
  - `make k8s-up ENV=dev` : Déployer l'environnement dev dans le namespace `ft-transcendence-dev`
  - `make k8s-up ENV=test` : Déployer l'environnement test dans le namespace `ft-transcendence-test`
  - `make k8s-up ENV=production` : Déployer l'environnement production dans le namespace `ft-transcendence-production`
  - `make k8s-down ENV=dev` : Arrêter l'environnement
  - `make k8s-clean ENV=dev` : Nettoyer complètement
  - `make k8s-logs ENV=dev SVC=auth` : Voir les logs
  - `make k8s-status ENV=dev` : Voir l'état des pods et services
  - `make k8s-validate ENV=dev` : Valider les manifests Kustomize
  - `make k8s-port-forward ENV=dev SVC=auth PORT=3000` : Port-forward pour accès local
  - `make k8s-build SVC=auth` : Build des images Docker
  - `make k8s-check` : Vérifier les prérequis (kubectl, kustomize)
- [x] Maintenir la compatibilité avec Docker Compose pour la transition
- [x] Ajouter des commandes de validation (kubectl, kustomize)
- [x] Mapper automatiquement les valeurs ENV vers les noms de namespaces (`dev` → `ft-transcendence-dev`)

---

### Phase 2 : Services d'Infrastructure - Base (Semaine 3-4)

**Objectif** : Déployer les services d'infrastructure fondamentaux

#### 2.1 Storage pour SQLite

- [x] Créer les StorageClasses pour chaque environnement
  - `fast-ssd` pour production
  - `standard` pour dev/test
- [x] Configurer les PersistentVolumeClaims pour les services applicatifs
  - `auth-db-pvc` pour le service auth
  - `matchmaking-db-pvc` pour le service matchmaking
- [x] Documenter la stratégie de backup et restauration
- [x] Tester la persistance des données lors des redémarrages

#### 2.2 Redis

- [x] Migrer vers le Chart Helm Bitnami (`redis`)
  - Utilisation de l'image officielle Docker Hub `redis:7.2`
  - Configuration via `values.yaml` et Kustomize `helmCharts`
- [x] Configurer la persistance avec PersistentVolume
- [x] Ajouter les health checks (liveness/readiness probes)
- [x] Créer les overlays pour dev/test/prod
  - Dev : 1 replica, ressources réduites
  - Test/Prod : 3 replicas, ressources adaptées
- [x] Documenter l'accès depuis les services applicatifs

#### 2.3 RabbitMQ

- [x] Migrer vers le Chart Helm Bitnami (`rabbitmq`)
  - Utilisation de l'image officielle Docker Hub `rabbitmq:3.12-management`
  - Configuration via `values.yaml` et Kustomize `helmCharts`
- [x] Configurer la persistance et la haute disponibilité
- [x] Ajouter les health checks (custom probes avec `rabbitmq-diagnostics`)
- [x] Créer les overlays pour dev/test/prod
- [x] Documenter la configuration des exchanges et queues

#### 2.4 Nginx Ingress Controller

- [x] Migrer vers le Chart Helm Kubernetes (`ingress-nginx`)
- [x] Configurer ModSecurity/WAF pour la sécurité
- [x] Créer les ConfigMaps pour la configuration Nginx
- [x] Configurer les annotations pour Cloudflare (production)
- [x] Documenter les règles Ingress par environnement

---

### Phase 3 : Services d'Infrastructure - Sécurité et Observabilité (Semaine 5-6)

**Objectif** : Déployer Vault et les outils d'observabilité

#### 3.1 HashiCorp Vault

- [ ] Déployer Vault en mode HA (production) ou standalone (dev/test)
- [ ] Configurer le stockage backend (Consul ou autre)
- [ ] Configurer l'authentification AppRole pour les services
- [ ] Créer les policies et secrets pour chaque service
- [ ] Documenter le flux d'authentification et de récupération des secrets
- [ ] Configurer la rotation des secrets
- [ ] Tester l'intégration avec les services applicatifs

#### 3.2 Stack ELK (Elasticsearch, Logstash, Kibana)

- [ ] Déployer Elasticsearch
  - StatefulSet avec 3 nodes pour production
  - 1 node pour dev/test
  - PersistentVolumes pour la persistance
- [ ] Déployer Logstash
  - ConfigMap pour les pipelines de traitement
  - Service pour la réception des logs
- [ ] Déployer Kibana
  - Deployment avec Service
  - Ingress pour l'accès (dev/test uniquement)
- [ ] Configurer Filebeat en DaemonSet pour la collecte des logs
- [ ] Créer les index patterns et dashboards de base
- [ ] Documenter la configuration des logs par service

#### 3.3 Prometheus & Grafana

- [ ] Déployer Prometheus
  - StatefulSet avec PersistentVolume
  - ConfigMap pour les règles de scraping
  - ServiceMonitor CRDs pour les services applicatifs
- [ ] Déployer Grafana
  - Deployment avec Service
  - ConfigMap pour les dashboards
  - Ingress pour l'accès (dev/test uniquement)
  - PersistentVolume pour la persistance des dashboards
- [ ] Configurer AlertManager pour les alertes
- [ ] Créer les dashboards de base pour chaque service
- [ ] Documenter les métriques exposées par chaque service

---

### Phase 4 : Packages d'Intégration (Semaine 7-8)

**Objectif** : Développer les packages réutilisables pour l'intégration avec l'infrastructure

#### 4.1 Package Vault Client (`packages/my-vault-client`)

- [ ] Créer le package de base
- [ ] Implémenter l'authentification AppRole
- [ ] Implémenter la récupération de secrets
- [ ] Ajouter le support de la rotation des secrets
- [ ] Ajouter la gestion d'erreurs et retry logic
- [ ] Créer la documentation d'utilisation
- [ ] Ajouter les tests unitaires

#### 4.2 Package RabbitMQ Client (`packages/my-rabbitmq-client`)

- [ ] Créer le package de base
- [ ] Implémenter la connexion et la gestion des connexions
- [ ] Implémenter la création d'exchanges et queues
- [ ] Implémenter la publication et consommation de messages
- [ ] Ajouter le support des patterns (pub/sub, work queues, etc.)
- [ ] Ajouter la gestion d'erreurs et reconnexion automatique
- [ ] Créer la documentation d'utilisation
- [ ] Ajouter les tests unitaires

#### 4.3 Package Redis Client (`packages/my-redis-client`)

- [ ] Créer le package de base
- [ ] Implémenter la connexion et la gestion des connexions
- [ ] Implémenter les opérations de base (get, set, etc.)
- [ ] Implémenter les structures de données avancées (Lists, Sorted Sets)
- [ ] Ajouter la gestion d'erreurs et reconnexion automatique
- [ ] Créer la documentation d'utilisation
- [ ] Ajouter les tests unitaires

#### 4.4 Package Prometheus Metrics (`packages/my-prometheus-client`)

- [ ] Créer le package de base
- [ ] Implémenter l'exposition des métriques Prometheus
- [ ] Ajouter les helpers pour les métriques courantes (Counter, Gauge, Histogram)
- [ ] Intégrer avec Fastify pour l'endpoint `/metrics`
- [ ] Créer la documentation d'utilisation
- [ ] Ajouter les tests unitaires

#### 4.5 Package ELK Logging (`packages/my-elk-logger`)

- [ ] Créer le package de base
- [ ] Implémenter le formatage JSON structuré des logs
- [ ] Ajouter le support du tracing distribué (traceId)
- [ ] Intégrer avec les loggers existants (Pino pour Fastify)
- [ ] Créer la documentation d'utilisation
- [ ] Ajouter les tests unitaires

---

### Phase 5 : Services Applicatifs (Semaine 9-10)

**Objectif** : Déployer les services applicatifs dans Kubernetes

#### 5.1 Service Auth

- [ ] Créer les manifests de base
  - Deployment avec health checks
  - Service ClusterIP
  - ConfigMap pour la configuration
  - Secret pour les secrets (via Vault)
- [ ] Configurer le PersistentVolumeClaim pour SQLite
- [ ] Intégrer avec Vault pour les secrets
- [ ] Intégrer avec RabbitMQ pour les événements
- [ ] Intégrer avec Prometheus pour les métriques
- [ ] Intégrer avec ELK pour les logs
- [ ] Créer les overlays pour dev/test/prod
- [ ] Configurer les ressources (requests/limits) par environnement
- [ ] Tester le déploiement et la fonctionnalité

#### 5.2 Service Matchmaking

- [ ] Créer les manifests de base
  - Deployment avec health checks
  - Service ClusterIP
  - ConfigMap pour la configuration
  - Secret pour les secrets (via Vault)
- [ ] Configurer le PersistentVolumeClaim pour SQLite
- [ ] Intégrer avec Vault pour les secrets
- [ ] Intégrer avec RabbitMQ pour les événements
- [ ] Intégrer avec Redis pour la file d'attente partagée
- [ ] Intégrer avec Prometheus pour les métriques
- [ ] Intégrer avec ELK pour les logs
- [ ] Créer les overlays pour dev/test/prod
- [ ] Configurer le scaling horizontal (HPA) pour production
- [ ] Tester le déploiement et la fonctionnalité

#### 5.3 Frontend (React)

- [ ] Créer les manifests de base
  - Deployment avec health checks
  - Service ClusterIP
  - ConfigMap pour les variables d'environnement
- [ ] Configurer la build de l'image Docker
- [ ] Créer l'Ingress pour l'exposition
- [ ] Configurer le support SPA (Single Page Application)
- [ ] Intégrer avec les services backend via les Services Kubernetes
- [ ] Créer les overlays pour dev/test/prod
- [ ] Tester le déploiement et la fonctionnalité

---

### Phase 6 : Configuration Multi-Environnements (Semaine 11)

**Objectif** : Finaliser la configuration pour chaque environnement

#### 6.1 Environnement Dev

- [ ] Configurer les ressources réduites
- [ ] Configurer les replicas à 1 pour tous les services
- [ ] Configurer les StorageClasses avec stockage local
- [ ] Configurer les Ingress en ClusterIP ou NodePort
- [ ] Désactiver les fonctionnalités de production (HA, backups)
- [ ] Configurer le hot reload pour le développement local
- [ ] Documenter l'utilisation pour le développement

#### 6.2 Environnement Test

- [ ] Configurer les ressources similaires à la production
- [ ] Configurer les replicas appropriés (2-3)
- [ ] Configurer les StorageClasses avec persistance
- [ ] Configurer les NetworkPolicies pour l'isolation
- [ ] Configurer les health checks complets
- [ ] Désactiver l'exposition publique
- [ ] Documenter l'utilisation pour les tests

#### 6.3 Environnement Production

- [ ] Configurer les ressources optimisées
- [ ] Configurer les replicas multiples (minimum 3 pour HA)
- [ ] Configurer les PodDisruptionBudgets
- [ ] Configurer les PodAntiAffinity pour la distribution
- [ ] Configurer les StorageClasses haute performance
- [ ] Configurer les Ingress avec TLS et Cloudflare
- [ ] Configurer les NetworkPolicies strictes
- [ ] Configurer les HPA pour l'auto-scaling
- [ ] Configurer les backups automatiques
- [ ] Documenter les procédures de déploiement et rollback

---

### Phase 7 : Sécurité et Résilience (Semaine 12)

**Objectif** : Renforcer la sécurité et la résilience

#### 7.1 Sécurité Réseau

- [ ] Créer les NetworkPolicies pour chaque service
- [ ] Configurer l'isolation entre namespaces
- [ ] Configurer les règles d'ingress/egress strictes
- [ ] Documenter les flux de communication autorisés

#### 7.2 RBAC

- [ ] Créer les ServiceAccounts pour chaque service
- [ ] Configurer les Roles et RoleBindings
- [ ] Appliquer le principe du moindre privilège
- [ ] Documenter les permissions requises

#### 7.3 Pod Security Standards

- [ ] Appliquer les PodSecurityStandards par environnement
- [ ] Configurer les SecurityContext pour chaque pod
- [ ] Vérifier la conformité avec les standards
- [ ] Documenter les configurations de sécurité

#### 7.4 High Availability

- [ ] Configurer les PodDisruptionBudgets pour les services critiques
- [ ] Configurer les TopologySpreadConstraints
- [ ] Tester les scénarios de panne
- [ ] Documenter les procédures de récupération

---

### Phase 8 : Monitoring et Alerting (Semaine 13)

**Objectif** : Finaliser le monitoring et les alertes

#### 8.1 Dashboards Grafana

- [ ] Créer les dashboards pour chaque service
- [ ] Créer le dashboard global de l'infrastructure
- [ ] Configurer les alertes critiques
- [ ] Documenter les métriques surveillées

#### 8.2 Alertes Prometheus

- [ ] Créer les règles d'alerte pour chaque service
- [ ] Configurer les seuils d'alerte par environnement
- [ ] Configurer les canaux de notification
- [ ] Documenter les procédures de réponse aux alertes

#### 8.3 Logs ELK

- [ ] Créer les index patterns pour chaque service
- [ ] Créer les dashboards de logs
- [ ] Configurer les alertes sur les logs critiques
- [ ] Documenter les requêtes de logs courantes

---

### Phase 9 : Documentation et Tests (Semaine 14)

**Objectif** : Finaliser la documentation et tester l'infrastructure complète

#### 9.1 Documentation

- [ ] Documenter l'architecture complète
- [ ] Créer les guides de déploiement par environnement
- [ ] Documenter les procédures de maintenance
- [ ] Créer les runbooks pour les incidents courants
- [ ] Documenter les procédures de backup et restauration

#### 9.2 Tests d'Intégration

- [ ] Tester le déploiement complet en dev
- [ ] Tester le déploiement complet en test
- [ ] Tester les scénarios de panne et récupération
- [ ] Tester le scaling automatique
- [ ] Tester les mises à jour (rolling updates)

#### 9.3 Validation

- [ ] Valider la conformité avec les exigences du sujet
- [ ] Valider la sécurité de l'infrastructure
- [ ] Valider les performances
- [ ] Valider la résilience

---

## Dépendances et Ordre d'Implémentation

### Ordre Critique

1. **Phase 1** (Fondations) → **Phase 2** (Infrastructure Base)
2. **Phase 2** → **Phase 3** (Infrastructure Avancée)
3. **Phase 3** → **Phase 4** (Packages) → **Phase 5** (Applications)
4. **Phase 5** → **Phase 6** (Multi-Environnements)
5. **Phase 6** → **Phase 7** (Sécurité) → **Phase 8** (Monitoring)
6. **Phase 8** → **Phase 9** (Documentation)

### Dépendances Techniques

- **Vault** doit être déployé avant les services applicatifs (Phase 3.1 → Phase 5)
- **Redis** et **RabbitMQ** doivent être déployés avant les services applicatifs (Phase 2 → Phase 5)
- **Storage** doit être configuré avant les services applicatifs (Phase 2.1 → Phase 5)
- **Packages d'intégration** doivent être développés avant l'intégration dans les services (Phase 4 → Phase 5)
- **Prometheus** doit être déployé avant la configuration des métriques (Phase 3.3 → Phase 8)

---

## Commandes Makefile Cibles

**Note** : Les commandes utilisent des valeurs d'environnement courtes (`dev`, `test`, `production`) qui sont automatiquement mappées vers les namespaces Kubernetes (`ft-transcendence-dev`, `ft-transcendence-test`, `ft-transcendence-production`).

### Commandes de Base

```makefile
# Démarrage
make k8s-up ENV=dev          # Déployer dans le namespace ft-transcendence-dev
make k8s-up ENV=test         # Déployer dans le namespace ft-transcendence-test
make k8s-up ENV=production   # Déployer dans le namespace ft-transcendence-production

# Arrêt
make k8s-down ENV=dev        # Arrêter l'environnement dev
make k8s-down ENV=test      # Arrêter l'environnement test
make k8s-down ENV=production # Arrêter l'environnement production

# Nettoyage
make k8s-clean ENV=dev       # Nettoyer complètement l'environnement dev

# Logs
make k8s-logs ENV=dev SVC=auth        # Logs du service auth en dev
make k8s-logs ENV=dev SVC=matchmaking # Logs du service matchmaking en dev

# Status
make k8s-status ENV=dev      # État de tous les pods en dev
make k8s-status ENV=test     # État de tous les pods en test
make k8s-status ENV=production # État de tous les pods en production
```

### Commandes Avancées

```makefile
# Build et push des images
make k8s-build              # Build toutes les images Docker
make k8s-push ENV=dev       # Push les images pour l'environnement

# Validation
make k8s-validate ENV=dev   # Valider les manifests Kustomize

# Port-forward pour accès local
make k8s-port-forward ENV=dev SVC=auth PORT=3000
```

---

## Risques et Mitigations

### Risques Identifiés

1. **Complexité de Migration** : Migration depuis Docker Compose vers Kubernetes

   - _Mitigation_ : Migration progressive, maintien de Docker Compose en parallèle

2. **Gestion des Secrets** : Intégration complexe avec Vault

   - _Mitigation_ : Développement précoce du package Vault, tests approfondis

3. **Persistance SQLite** : Gestion des volumes persistants

   - _Mitigation_ : Tests précoces de la persistance, stratégie de backup claire

4. **Scaling Horizontal** : État partagé pour le matchmaking

   - _Mitigation_ : Intégration Redis dès le début, tests de charge

5. **Multi-Environnements** : Complexité de la configuration
   - _Mitigation_ : Utilisation de Kustomize, documentation exhaustive

---

## Métriques de Succès

- [ ] Tous les services d'infrastructure déployés et fonctionnels
- [ ] Tous les services applicatifs déployés et fonctionnels
- [ ] Packages d'intégration développés et testés
- [ ] Support complet des 3 environnements (dev, test, prod)
- [ ] Makefile fonctionnel avec une seule commande de démarrage
- [ ] Documentation complète et à jour
- [ ] Tests d'intégration réussis
- [ ] Conformité avec les exigences du sujet

---

## Notes Importantes

- **Pas d'ArgoCD** : Le projet n'utilisera pas ArgoCD pour le déploiement GitOps
- **MetalLB** : Utilisé pour les LoadBalancer services en on-premise
- **Cloudflare** : Utilisé uniquement en production pour la protection et le CDN
- **Rootless Mode** : Tous les conteneurs doivent s'exécuter en mode non-root
- **Single Command** : Le Makefile doit permettre de démarrer l'application en une seule commande selon l'environnement
- **Convention de Nommage des Namespaces** : Les namespaces utilisent le préfixe `ft-transcendence-` suivi de l'environnement (`ft-transcendence-dev`, `ft-transcendence-test`, `ft-transcendence-production`) pour éviter les conflits avec d'autres applications sur le même cluster Kubernetes

---

## Références

- [Documentation Kubernetes](https://kubernetes.io/docs/)
- [Kustomize Documentation](https://kustomize.io/)
- [HashiCorp Vault](https://www.vaultproject.io/docs)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [ELK Stack Documentation](https://www.elastic.co/guide/)
- [Sujet du Projet](../docs/subject.pdf)
