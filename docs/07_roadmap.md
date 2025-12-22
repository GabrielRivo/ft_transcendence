# Roadmap de Développement

Ce document détaille le plan de mise en œuvre du service de Matchmaking. La stratégie adoptée privilégie une approche **"Cœur de Métier d'abord"** : nous développerons et validerons l'algorithme et les WebSockets en isolation avant d'intégrer les briques d'infrastructure complexes (RabbitMQ, Vault, ELK).

---

### Phase 1 : Initialisation et Cœur Algorithmique (MVP Local)
**Objectif :** Cette première étape vise à construire les fondations solides du service. Nous allons isoler la logique métier pure du matchmaking pour la développer et la tester en mémoire (In-Memory), sans nous soucier pour l'instant de la couche réseau (HTTP/WS) ou de la persistance. À la fin de cette phase, nous aurons un "moteur" capable de former des paires virtuellement.

* **1.1 Structure du Projet (Boilerplate & Nettoyage)**
    * **Nettoyage :** Suppression du module d'exemple (`src/sample/`) pour partir sur une base propre.
    * **Configuration de l'Environnement :**
        * Vérification de la configuration TypeScript (`tsconfig.json`) pour cibler `ES2022` / `NodeNext`.
        * Validation des règles de linter (`.eslintrc` / `.prettierrc`) pour garantir la cohérence du style de code dès le début.
    * **Architecture Modulaire :**
        * Création du dossier `src/matchmaking/` qui contiendra le cœur du service.
        * Mise en place de `MatchmakingModule` décoré avec `@Module` pour l'injection de dépendances, importé ensuite dans l'`AppModule` racine.
        * Installation et vérification du bon fonctionnement de `my-fastify-decorators` et `fastify`.

* **1.2 Modélisation des Données (In-Memory)**
    * **Interface `QueuedPlayer` :** Définition de l'interface TypeScript stricte représentant un joueur en attente.
      ```typescript
      interface QueuedPlayer {
        userId: string;       // Identifiant unique
        socketId: string;     // Pour la communication future
        elo: number;          // Niveau de compétence fixe à l'entrée
        joinTime: number;     // Timestamp d'entrée (Date.now())
        rangeFactor: number;  // Facteur d'élargissement (défaut: 1)
      }
      ```
    * **Service `MatchmakingService` :**
        * Implémentation de la classe décorée par `@Service()`.
        * Déclaration de la structure de données volatile : `private activeQueue: QueuedPlayer[] = [];`.
    * **Méthodes Atomiques (CRUD In-Memory) :**
        * `addPlayer(player)` : Ajoute un joueur en vérifiant au préalable qu'il n'est pas déjà présent (unicité sur `userId`).
        * `removePlayer(userId)` : Supprime proprement un joueur de la liste (ex: en cas d'annulation).
        * `getQueueStats()` : Méthode utilitaire retournant la taille actuelle de la file (pour le debug).

* **1.3 Implémentation de la "Game Loop"**
    * **Le Ticker (`setInterval`) :**
        * Mise en place d'une méthode `gameLoop()` exécutée automatiquement toutes les X ms (ex: 1000ms) via un `setInterval` lancé dans le constructeur ou un hook `onModuleInit`.
    * **Logique "Bucket Expansion" :**
        * Développement de l'algorithme de tri à chaque tick :
            1. Incrémenter le `rangeFactor` des joueurs en fonction de `Date.now() - joinTime`.
            2. Calculer la fenêtre de recherche pour le joueur prioritaire (tête de liste).
            3. Scanner la file pour trouver un adversaire compatible (`Math.abs(elo1 - elo2) <= tolerance`).
    * **Validation (Proof of Concept) :**
        * Création d'un script de test manuel (`src/scripts/test-algo.ts` ou test Jest) qui :
            1. Injecte 10 joueurs avec des ELOs variés (ex: 800, 1200, 2500).
            2. Affiche dans la console les paires formées par la boucle au fil du temps (ex: `[T+5s] MATCH FOUND: UserA (1200) vs UserB (1250)`).

---

### Phase 2 : Interfaces de Communication (REST & WebSocket)
**Objectif :** Cette phase consiste à interconnecter le moteur de matchmaking (développé en Phase 1) avec le monde extérieur. Nous allons implémenter les contrôleurs réseaux, gérer le cycle de vie des sockets en temps réel et sécuriser les données entrantes pour éviter toute corruption de la logique métier.

* **2.1 Interface WebSocket (`MatchmakingGateway`)**
    * **Configuration Socket.io :**
        * Validation de l'intégration du plugin `socket.io` (déjà présent dans `src/plugins/socket-plugin.ts`) avec l'instance Fastify.
    * **Implémentation du Gateway :**
        * Création de la classe `MatchmakingGateway` décorée par `@WebSocketGateway()`.
        * Injection du `MatchmakingService` pour faire le pont entre les événements réseaux et la logique métier.
    * **Gestion des Événements Entrants :**
        * `@SubscribeMessage('join_queue')` : Réception de la demande, extraction du `userId` (mocké ou via token décodé) et appel à `service.addPlayer()`.
        * `@SubscribeMessage('leave_queue')` : Appel à `service.removePlayer()`.
    * **Cycle de Vie (Connection/Disconnection) :**
        * Implémentation des hooks `@SubscribeConnection` et `@SubscribeDisconnection`.
        * **Logique critique :** Sur `handleDisconnect`, déclencher impérativement le retrait du joueur de la file (`service.removePlayer(socket.id)`) pour garantir qu'aucun match ne soit proposé à un utilisateur parti (prévention des "matchs fantômes").
    * **Notifications Sortantes (Mockées) :**
        * Émission de l'événement `queue_joined` dès l'inscription réussie.
        * Simulation de l'événement `match_found` lorsque l'algo trouve une paire (renvoi d'un `gameId` et d'une `serverUrl` fictifs pour valider le flux frontend).

* **2.2 Validation des Données (Zod)**
    * **Définition des Schémas (DTOs) :**
        * Création de schémas Zod stricts pour typer les payloads entrants (ex: `JoinQueueDto`).
        * *Exemple de règle :* Vérifier que le mode de jeu est bien "classic" ou "custom".
    * **Pipeline de Validation :**
        * Mise en place d'un Pipe ou d'un Middleware de validation dans le Gateway.
        * **Stratégie "Fail Fast" :** Si le payload ne respecte pas le schéma, la requête est rejetée immédiatement avec une erreur explicite avant même d'atteindre le service.

* **2.3 API REST de Base (`MatchmakingController`)**
    * **Création du Contrôleur :**
        * Implémentation de la classe `MatchmakingController` décorée par `@Controller('/matchmaking')`.
    * **Endpoint `GET /health` :**
        * Route publique de "Liveness Probe".
        * Retourne `{ status: 'ok', uptime: ... }` pour permettre à Docker/Kubernetes de vérifier la santé du conteneur.
    * **Endpoint Debug `GET /queue` (Dev Only) :**
        * Route protégée (ou réservée au dev).
        * Retourne le contenu JSON de l'array `activeQueue` du service.
        * *Utilité :* Permet aux développeurs Frontend de visualiser en temps réel si leur bouton "Jouer" a bien ajouté l'utilisateur dans la mémoire du serveur.

---

### Phase 3 : Persistance et Données Froides (SQLite)
**Objectif :** Cette phase ajoute la mémoire à long terme au service. Nous allons remplacer les données mockées ou volatiles par un stockage persistant pour l'historique des matchs et la gestion des sanctions, en utilisant le driver SQLite déjà présent dans les dépendances.

* **3.1 Intégration et Schémas SQLite**
    * **Configuration du Plugin (`sqlite-plugin.ts`) :**
        * Validation du plugin existant (`src/plugins/sqlite-plugin.ts`) qui charge déjà `better-sqlite3` et expose l'objet `db` via le décorateur Fastify.
        * *Action :* S'assurer que le fichier de base de données est bien stocké dans un volume persistant (dossier `/data`).
    * **Définition du Schéma (`init.sql`) :**
        * Remplacement du contenu de test actuel dans `data/init.sql` par les véritables tables métier définies dans la documentation technique :
            1.  `matchmaking_sessions` : Pour l'audit (UUIDs des joueurs, timestamps, statut).
            2.  `penalties` : Pour les bannissements temporaires (`user_id`, `expires_at`, `reason`).
        * *Validation :* Vérifier au démarrage que les tables sont créées correctement si elles n'existent pas.

* **3.2 Implémentation de la Couche Repository**
    * **Création des Repositories :**
        * Mise en place du dossier `src/matchmaking/repositories/`.
        * Développement de classes dédiées (ex: `MatchHistoryRepository`, `PenaltyRepository`) pour encapsuler les requêtes SQL brutes (Prepared Statements).
    * **Méthodes Clés :**
        * `MatchHistoryRepository.createSessionLog(session: SessionDto)` : Insertion optimisée pour l'écriture des logs de fin de matchmaking.
        * `PenaltyRepository.addPenalty(userId: string, duration: number)` : Création d'une sanction avec calcul automatique de la date d'expiration.
        * `PenaltyRepository.getActivePenalty(userId: string)` : Requête de lecture (`SELECT ... WHERE expires_at > NOW()`) pour vérifier l'éligibilité d'un joueur.

* **3.3 Liaison Métier (Service Layer)**
    * **Injection des Dépendances :**
        * Injection des nouveaux Repositories dans le `MatchmakingService`.
    * **Logique de Contrôle (Guard) :**
        * Modification de la méthode `joinQueue` : Avant d'ajouter un joueur en mémoire, interroger `penaltyRepo.getActivePenalty()`. Si une pénalité est active, rejeter la demande (Exception `403 Forbidden`).
    * **Logique d'Archivage (Fire and Forget) :**
        * Modification de la boucle de matchmaking : Une fois une paire trouvée et notifiée, appeler `matchHistoryRepo.createSessionLog()` sans `await`. Cela garantit que l'écriture sur disque (I/O) ne bloque pas le tick suivant de la Game Loop.

---

### Phase 4 : Intégration Système et Événementiel
**Objectif :** Cette étape cruciale marque la fin du développement en isolation. Nous allons connecter le service au reste de l'infrastructure distribuée. Cela nécessite que le *Game Service* et le conteneur *RabbitMQ* soient accessibles (même partiellement) pour valider les flux d'échange.

* **4.1 Bus d'Événements (RabbitMQ)**
    * **Installation du Package Partagé :**
        * Intégration de la librairie interne `@transcendence/message-broker` dans le `package.json`.
        * Configuration du client AMQP dans le `CommunicationModule` en utilisant les variables d'environnement (URI, Exchange) injectées.
    * **Souscription (Incoming Events) :**
        * Implémentation du décorateur `@EventHandler` (ou équivalent) pour écouter le topic `game.finished`.
        * **Logique Métier :** À la réception, extraire les nouveaux scores ELO des joueurs et mettre à jour le cache local (ou invalider l'entrée si le joueur est revenu en file).
    * **Publication (Outgoing Events) :**
        * Création d'une tâche périodique (Cron/Interval) qui publie l'événement `matchmaking.status`.
        * Le payload doit contenir les métriques temps réel (`queueLength`, `averageWaitTime`) destinées au Dashboard Admin.

* **4.2 Communication Inter-Services (REST Client)**
    * **Appel Synchrone de Création :**
        * Remplacement du mock de la Phase 2 par un véritable appel HTTP (`POST`) vers l'API du *Game Service*.
        * Configuration du client HTTP (Axios/Fetch) avec les timeouts appropriés (ex: 5s max) pour éviter de bloquer la boucle de matchmaking.
    * **Gestion des Erreurs Distribuées (Rollback) :**
        * Mise en place d'une logique de transaction compensatoire :
            * *Scénario nominal :* Le Game Service répond `201 Created` -> On notifie les joueurs.
            * *Scénario d'échec :* Le Game Service répond `500` ou Timeout -> **Annuler le match**. Les deux joueurs doivent être remis en tête de file (priorité haute) ou notifiés de l'erreur, sans être considérés comme "matchés".
    * **Handover Final :**
        * Réception du `gameId` UUID v4 généré par le Game Service.
        * Construction du payload final `match_found` incluant ce `gameId` et l'URL de connexion WebSocket du serveur de jeu.
        * Transmission aux deux clients via le `MatchmakingGateway`.

---

### Phase 5 : Infrastructure et Observabilité
**Objectif :** Cette phase finalise l'industrialisation du service. Nous allons sécuriser la gestion des configurations sensibles en supprimant les fichiers `.env` statiques et mettre en place les sondes nécessaires pour que le service puisse être surveillé efficacement au sein d'un cluster de production.

* **5.1 Gestion des Secrets ("Zero Trust" avec Vault)**
    * **Script de Bootstrap :**
        * Développement d'un module de pré-démarrage qui s'exécute avant l'initialisation de Fastify.
        * Ce script doit s'authentifier auprès de **HashiCorp Vault** (via AppRole ou Token injecté) pour récupérer les crédentials de production (URI RabbitMQ, Clés privées JWT).
    * **Injection Dynamique :**
        * Remplacement du chargement via `dotenv` par une injection directe en mémoire vive.
        * *Validation :* S'assurer qu'aucune donnée sensible n'est écrite sur le disque ou visible dans les variables d'environnement du conteneur (`docker inspect`).

* **5.2 Observabilité (ELK & Prometheus)**
    * **Logging Structuré (JSON) :**
        * Configuration du logger Fastify pour émettre les logs exclusivement sur `STDOUT` au format **NDJSON** (Newline Delimited JSON).
        * Ajout de métadonnées de traçabilité (`traceId`, `service: "matchmaking"`) pour faciliter l'indexation dans Elasticsearch (Stack ELK).
    * **Instrumentation Métrologique :**
        * Utilisation de `prom-client` pour exposer l'endpoint `/metrics`.
        * Implémentation des jauges métier critiques : `matchmaking_queue_size` (nombre de joueurs en attente) et `matchmaking_wait_duration_seconds` (histogramme des temps d'attente).
        * *Test :* Vérifier que le format de sortie est compatible avec le standard OpenMetrics pour le scraping Prometheus.

* **5.3 Conteneurisation de Production**
    * **Optimisation Docker (Multi-Stage Build) :**
        * Refonte du `Dockerfile` pour séparer l'étape de build (contenant TypeScript et les `devDependencies`) de l'image finale.
        * Utilisation d'une image de base minimale (ex: `node:alpine`) pour réduire la surface d'attaque.
    * **Sécurité "Rootless" :**
        * Configuration explicite de l'utilisateur non-privilégié (`USER node`) pour l'exécution du processus.
    * **Orchestration du Démarrage :**
        * Finalisation du script `docker-entrypoint.sh` pour gérer l'attente des dépendances (Vault, RabbitMQ) avant de lancer l'application Node.js.

---

### Phase 6 : Fiabilisation et Tests (QA)
**Objectif :** Cette phase finale est dédiée à la validation technique et fonctionnelle. L'objectif est de s'assurer que le service peut tenir la charge attendue sans régression, et que l'algorithme se comporte de manière déterministe avant la mise en production.

* **6.1 Tests Unitaires et d'Intégration (Jest)**
    * **Stratégie de Test :**
        * Utilisation de **Jest** (déjà configuré via `ts-jest`) pour l'exécution des suites de tests.
        * Ciblage prioritaire de la logique métier contenue dans `MatchmakingService`.
    * **Scénarios Critiques à Couvrir :**
        * **Algorithme "Bucket Expansion" :** Utilisation de `jest.useFakeTimers()` pour simuler le passage du temps et vérifier que le `rangeFactor` s'incrémente correctement, permettant à deux joueurs de niveaux différents de se rencontrer après le délai imparti.
        * **Concurrence :** Vérifier qu'un joueur ne peut pas être ajouté deux fois dans la file ou être matché simultanément avec deux adversaires.
    * **Isolation (Mocking) :**
        * Création de mocks pour le `Socket.io Server` afin de vérifier l'émission des événements (`emit`) sans établir de connexion réseau réelle.
        * Mock des Repositories SQLite pour tester la logique sans dépendre de l'état du fichier de base de données.

* **6.2 Tests de Charge et de Stabilité (Stress Test)**
    * **Script de Simulation :**
        * Développement d'un outil de tir dédié (ex: `scripts/stress-test.ts`) utilisant la librairie `socket.io-client`.
        * **Scénario :** Connexion simultanée de 100 à 500 clients virtuels ("Bots") effectuant des cycles rapides de `join_queue` / `leave_queue`.
    * **Critères de Validation :**
        * **Non-blocage :** S'assurer que la "Game Loop" ne gèle pas le thread principal (Event Loop Lag < 50ms) malgré la charge.
        * **Intégrité Mémoire :** Surveiller la consommation RAM (Heap Usage) sur une session longue (10-15 min) pour garantir qu'il n'y a pas de fuite mémoire (Memory Leak) liée aux objets `QueuedPlayer` non nettoyés.

* **6.3 Nettoyage et "Definition of Done"**
    * **Sanitisation du Code :**
        * Suppression de tous les `console.log` de débogage résiduels au profit du logger structuré JSON.
        * Résolution des derniers avertissements du linter (ESLint) et suppression du code mort.
    * **Revue Finale :**
        * Audit de cohérence entre la documentation technique (`docs/`) et l'implémentation réelle.
        * Validation finale du build Docker en condition de production (taille de l'image, sécurité).