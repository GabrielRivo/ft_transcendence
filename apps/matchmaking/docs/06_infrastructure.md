# Infrastructure, Sécurité et Observabilité

### 1. Conteneurisation (Docker)

Le service de Matchmaking est déployé sous forme de microservice conteneurisé. Cette approche garantit l'immutabilité des déploiements et une isolation stricte de l'environnement d'exécution. La construction de l'image Docker suit rigoureusement les standards de l'industrie pour optimiser la taille, la performance et la sécurité.

* **Stratégie de Build : Multi-stage Builds**
    * **Objectif :** Minimiser la surface d'attaque et l'empreinte mémoire de l'image finale.
    * **Implémentation :** Le `Dockerfile` est divisé en deux étapes distinctes :
        1.  **Builder Stage :** Contient tous les outils de développement (compilateur TypeScript, `devDependencies`). C'est ici que le code source est transpilé et les dépendances installées.
        2.  **Runtime Stage :** Une image minimale (type `node:alpine` ou `distroless`) qui ne récupère que les artefacts compilés (`dist/`) et les dépendances de production depuis l'étape précédente.
    * **Résultat :** Une image légère, débarrassée du code source original et des outils inutiles (comme `npm` ou `git` dans certains cas), réduisant drastiquement les vecteurs d'attaque potentiels.

* **Sécurité de l'Exécution (Rootless Mode)**
    * **Principe de Moindre Privilège :** Il est impératif que le conteneur ne s'exécute **jamais** avec les privilèges `root`.
    * **Configuration :** L'instruction `USER node` (ou un UID spécifique comme `1001`) est définie explicitement à la fin du Dockerfile.
    * **Impact :** En cas de compromission de l'application (Remote Code Execution), l'attaquant se retrouve confiné avec des droits restreints, empêchant toute élévation de privilèges ou accès au système de fichiers de l'hôte ("Container Breakout").

* **Persistance des Données (Volumes)**
    * **Problème :** Le système de fichiers d'un conteneur est par nature éphémère. Tout redémarrage entraîne la perte des fichiers locaux.
    * **Solution :** Pour garantir la pérennité de la base de données SQLite (logs et pénalités), le dossier contenant le fichier `.sqlite` est monté via un **Volume Docker** (ou un Persistent Volume Claim dans Kubernetes). Cela sépare le cycle de vie des données de celui du processus applicatif.

* **Point d'Entrée et Bootstrapping**
    * **Script de Démarrage :** Le conteneur n'exécute pas directement l'application Node.js, mais passe par un script shell d'entrypoint (`docker-entrypoint.sh`).
    * **Rôle :** Ce script orchestre la séquence de démarrage critique :
        1.  Vérification de la disponibilité des services dépendants.
        2.  **Injection des Secrets :** Interrogation de **HashiCorp Vault** pour récupérer les crédentials RabbitMQ et les clés de chiffrement, qui sont injectés en variables d'environnement volatiles.
        3.  Lancement du processus serveur (`node dist/main.js`) uniquement si les étapes précédentes sont validées.



### 2. Gestion des Secrets (HashiCorp Vault)

Conformément aux exigences strictes du module **"Major Cybersecurity"**, ce service adopte une posture de sécurité "Zero Trust" concernant la gestion des configurations sensibles. L'architecture proscrit formellement le stockage de mots de passe, clés API ou certificats dans le code source (Hardcoded) ou dans des fichiers de configuration persistants (`.env`) au sein de l'image Docker.

* **Principe Fondamental : "Secrets en Mémoire Uniquement"**
    * **Objectif :** Éliminer le risque de fuite de secrets via le vol de code source (Git Leaks) ou l'inspection d'images de conteneurs.
    * **Fonctionnement :** Les variables sensibles n'existent que dans la mémoire vive (RAM) du processus Node.js pendant son exécution. Elles ne sont jamais écrites sur le disque dur.

* **Flux de Démarrage Sécurisé (Bootstrapping Flow)**
    L'initialisation du service suit un protocole strict qui doit réussir intégralement avant le lancement du serveur HTTP/WebSocket :

    1.  **Authentification :**
        Au démarrage, le conteneur s'authentifie auprès du serveur central **HashiCorp Vault**. Cette étape utilise généralement le mécanisme **AppRole** (recommandé pour la production) ou un `VAULT_TOKEN` éphémère injecté par l'orchestrateur.

    2.  **Récupération (Fetching) :**
        Une fois authentifié, le service demande l'accès aux secrets spécifiques à son scope (Matchmaking Service). Les clés critiques récupérées incluent :
        * `RABBITMQ_URI` : La chaîne de connexion complète (incluant utilisateur/mot de passe générés) pour le bus d'événements.
        * `JWT_PUBLIC_KEY` (ou `SECRET`) : La clé cryptographique permettant de vérifier la signature des tokens d'authentification des joueurs sans avoir à interroger le service d'authentification à chaque requête.

    3.  **Injection en Mémoire :**
        Les valeurs reçues sont injectées dans l'objet de configuration global de l'application (Singleton). Une fois cette opération terminée, le lien avec Vault peut être fermé.

* **Stratégie de Rotation**
    * **Contexte :** Pour limiter l'impact d'une compromission potentielle, les secrets (comme les mots de passe de base de données) peuvent être renouvelés périodiquement par Vault.
    * **Mécanisme :** Le service de Matchmaking n'implémente pas de rechargement à chaud (Hot Reload) complexe et risqué pour les secrets.
    * **Action :** En cas de rotation de clé, la stratégie privilégiée est le **Redémarrage Progressif (Rolling Restart)** des conteneurs. Les nouvelles instances récupéreront automatiquement les nouveaux secrets lors de leur phase de Bootstrapping, assurant une transition sans interruption de service.



### 3. Gestion des Logs (Stack ELK)

L'intégration avec le module "DevOps - Log Management" est assurée par une conformité stricte aux principes des *Twelve-Factor Apps*. Le service de Matchmaking ne gère pas ses propres fichiers de logs, mais s'appuie sur une chaîne de collecte centralisée (Stack ELK : Elasticsearch, Logstash, Kibana) pour garantir la traçabilité et le débogage dans cet environnement distribué.



* **Format de Sortie : JSON Structuré**
    * **Principe :** Tous les logs applicatifs sont émis exclusivement vers les flux standards de sortie (`STDOUT` pour l'information, `STDERR` pour les erreurs critiques).
    * **Structure :** Afin de faciliter l'indexation, les logs ne sont pas du texte brut mais des objets **JSON sérialisés** (NDJSON). Chaque entrée contient un contexte riche permettant de corréler les événements.
    * **Exemple de Log :**
    ```json
    {
      "level": "info",
      "timestamp": "2023-10-27T10:00:00.123Z",
      "service": "matchmaking-service",
      "traceId": "a1b2-c3d4-e5f6", // Pour le tracing distribué
      "msg": "Player joined queue",
      "context": {
        "userId": "550e8400-e29b...",
        "currentQueueSize": 14,
        "mode": "classic"
      }
    }
    ```

* **Pipeline de Collecte et d'Ingestion**
    Le service délègue la responsabilité du transport des logs à l'infrastructure sous-jacente :
    1.  **Captation (Filebeat) :** Un agent léger (Filebeat), déployé en mode "Sidecar" ou via le Daemon Docker, écoute les flux du conteneur en temps réel.
    2.  **Traitement (Logstash) :** Les logs sont transmis à Logstash qui effectue le parsing, la normalisation et, si nécessaire, l'anonymisation des données sensibles.
    3.  **Stockage (Elasticsearch) :** Les données structurées sont indexées dans le cluster Elasticsearch, rendant des millions de lignes de logs consultables en quelques millisecondes.

* **Visualisation et Analyse (Kibana)**
    L'interface Kibana sert de point d'entrée unique pour l'exploitation des logs du Matchmaking.
    * **Index Patterns :** Des motifs spécifiques (ex: `log-matchmaking-*`) sont configurés pour segmenter les recherches.
    * **Dashboards :** Les développeurs peuvent visualiser graphiquement la fréquence des erreurs, filtrer les logs par `gameId` pour retracer l'historique d'une partie spécifique, ou configurer des alertes si le volume de logs d'erreur dépasse un seuil critique.



### 4. Monitoring et Métriques (Prometheus & Grafana)

Dans le cadre du module "DevOps - Monitoring", le service de Matchmaking expose ses données de performance internes. Cette instrumentation est vitale pour comprendre le comportement des joueurs et détecter les goulots d'étranglement avant qu'ils n'affectent l'expérience utilisateur.


* **Exposition des Métriques**
    * **Standardisation :** Le service expose un endpoint HTTP dédié : `GET /metrics`.
    * **Format :** Les données sont restituées au format texte **Prometheus** (OpenMetrics).
    * **Implémentation Technique :** L'intégration se fait via la librairie standard `prom-client` (couplée à un plugin Fastify). Elle collecte automatiquement les métriques système (CPU, RAM, Event Loop lag) et permet l'injection de métriques métier personnalisées.
    * **Mécanisme :** Le serveur Prometheus central vient "scraper" (interroger) cet endpoint à intervalles réguliers (ex: toutes les 15 secondes) pour historiser les données.

* **Indicateurs Clés de Performance (KPIs)**
    Nous avons défini trois métriques métier spécifiques pour surveiller la santé de la file d'attente :

    1.  **`matchmaking_queue_size` (Gauge)**
        * **Type :** Jauge (Valeur qui peut monter et descendre).
        * **Description :** Nombre instantané de joueurs actuellement en attente d'un adversaire.
        * **Utilité :** Permet de visualiser les pics de fréquentation en temps réel. Une valeur constamment élevée peut indiquer un problème d'algorithme (les matchs ne se font pas).

    2.  **`matchmaking_wait_duration_seconds` (Histogram)**
        * **Type :** Histogramme.
        * **Description :** Distribution statistique du temps d'attente des joueurs avant de trouver un match réussi.
        * **Utilité :** C'est la métrique reine pour l'expérience utilisateur (UX). Elle permet de répondre à la question : *"95% de nos joueurs attendent-ils moins de 10 secondes ?"* (Percentile p95).

    3.  **`matchmaking_matches_created_total` (Counter)**
        * **Type :** Compteur (Valeur qui ne fait qu'augmenter).
        * **Description :** Nombre cumulé de sessions de jeu générées depuis le démarrage du service.
        * **Utilité :** Permet de mesurer le débit (Throughput) du système et la croissance de l'utilisation sur le long terme.

* **Stratégie d'Alerting (AlertManager)**
    Des règles de surveillance proactive sont configurées pour notifier les administrateurs via Slack ou Email en cas d'anomalie :

    * **Règle "Queue Saturation" (Embouteillage) :**
        * **Condition :** `matchmaking_queue_size > 50`
        * **Durée :** `for: 5m` (Pendant 5 minutes consécutives).
        * **Signification :** Si plus de 50 joueurs sont bloqués en file durablement, cela signifie probablement que le *Game Service* ne parvient plus à créer de nouvelles sessions (saturation) ou qu'un bug empêche le matching. Une intervention humaine est requise.



### 5. Sécurité Réseau (WAF & ModSecurity)

En application des directives du module **"Major Cybersecurity"**, le service de Matchmaking n'est jamais exposé directement sur l'internet public. Il bénéficie d'une protection périmétrique robuste assurée par un Web Application Firewall (WAF) intégré à l'infrastructure.

* **Positionnement Stratégique (Reverse Proxy)**
    * **Architecture :** Le conteneur du service est isolé dans un réseau privé virtuel. Tout le trafic entrant transite obligatoirement par une passerelle **Nginx** configurée en Reverse Proxy.
    * **Rôle de ModSecurity :** Ce module, greffé sur Nginx, agit comme un filtre d'inspection profond des paquets. Il analyse chaque requête HTTP entrante avant même qu'elle ne soit transmise au routeur Fastify du service Matchmaking.

* **Mécanismes de Protection (OWASP CRS)**
    * **Filtrage des Menaces :** Le WAF applique les règles du *OWASP Core Rule Set (CRS)*. Il bloque automatiquement les tentatives d'attaques courantes telles que les injections SQL (SQLi), le Cross-Site Scripting (XSS) ou les payloads JSON malveillants destinés à provoquer des dénis de service (DoS).
    * **Bénéfice :** Bien que le code du service valide déjà ses entrées (via Zod et l'ORM), le WAF offre une "première ligne de défense" qui rejette le trafic illégitime en amont, économisant ainsi les ressources du serveur d'application.

* **Configuration Spécifique pour WebSocket**
    * **Contrainte :** Les pare-feux applicatifs standards peuvent parfois interpréter les connexions persistantes ou les headers non-standards comme des anomalies.
    * **Adaptation :** Une configuration explicite a été appliquée sur le WAF pour autoriser le mécanisme de "Handshake" du protocole WebSocket :
        * Autorisation des headers `Upgrade: websocket` et `Connection: Upgrade`.
        * Exclusion de certaines règles de timeout HTTP strictes pour permettre le maintien de la connexion longue durée (Long-lived connection), tout en continuant d'inspecter le payload initial de connexion.



### 6. Résilience et Scalabilité (Microservices)

En adéquation avec les principes du module **"Designing the Backend as Microservices"**, cette section analyse la capacité du service à absorber la charge et à survivre aux pannes. Le service de Matchmaking présente cependant une particularité architecturale : c'est un service "Stateful" (qui maintient un état critique en mémoire), ce qui complexifie sa mise à l'échelle par rapport à une API REST classique.

* **Stratégie de Mise à l'Échelle Horizontale (Horizontal Scaling)**
    * **Le Défi de l'État Local :**
        Dans une architecture microservices standard, augmenter la capacité se fait en lançant plusieurs instances du même conteneur (Replica Sets). Cependant, pour le Matchmaking, une contrainte majeure existe : si la file d'attente est stockée dans la mémoire vive locale (Heap) de chaque instance, nous créons des "silos" isolés.
        * *Scénario d'échec :* Le Joueur A est connecté à l'Instance 1. Le Joueur B est connecté à l'Instance 2. Bien qu'ils soient tous deux "en attente", ils ne se rencontreront jamais car les deux instances ne partagent pas leur mémoire.
    * **La Solution (État Partagé via Redis) :**
        Pour rendre le scaling horizontal possible, l'état (la `ActiveQueue`) doit être externalisé.
        * Au lieu de stocker les joueurs dans un `Array` JS local, les instances doivent utiliser une structure de données partagée et atomique (comme une **List** ou un **Sorted Set** dans **Redis**).
        * Ainsi, n'importe quelle instance du service peut "piocher" dans ce pool commun pour former des matchs, garantissant l'unicité de la file d'attente globale.

* **Recouvrement et Auto-Guérison (Disaster Recovery)**
    * **Philosophie "Crash-Only" :**
        Le système est conçu pour tolérer les arrêts brutaux. En cas de bug critique (exception non gérée) ou de saturation mémoire (OOM Kill), le processus doit s'arrêter immédiatement plutôt que de continuer dans un état instable.
    * **Politique de Redémarrage :**
        * **Docker :** Utilisation de la directive `restart: always` ou `restart: on-failure` dans le `docker-compose.yml`.
        * **Orchestrateur :** Dans un contexte Kubernetes, le `Deployment` assure qu'un nombre défini de pods (ex: 1 ou plus) est toujours actif. Si le Health Check (`GET /health`) échoue, l'orchestrateur tue et remplace automatiquement le conteneur défaillant, minimisant ainsi le temps d'indisponibilité pour les utilisateurs finaux.