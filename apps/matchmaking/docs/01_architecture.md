# Architecture Technique et Design Patterns

### 1. Principes Généraux

L'architecture du service de Matchmaking repose sur une structure rigoureuse et standardisée, conçue pour garantir la maintenabilité, la testabilité et la scalabilité du code.

* **Paradigme Architectural**
* Le projet adopte une **architecture modulaire orientée services**, s'appuyant fortement sur le principe d'**Injection de Dépendances (DI)**. Cette approche s'inspire directement de l'architecture éprouvée de frameworks comme NestJS, favorisant un découpage clair et hiérarchique des composants.


* Le moteur sous-jacent retenu est **Fastify**, choisi pour sa faible surcharge (low overhead) et ses hautes performances, particulièrement adaptées au traitement de nombreuses requêtes asynchrones et connexions WebSocket.




* **Librairie Core (`my-fastify-decorators`)**
* Afin d'implémenter ce paradigme de manière élégante sur Fastify, le service utilise le package interne `my-fastify-decorators`. Cette librairie fournit un ensemble de décorateurs TypeScript permettant de structurer l'application de manière déclarative :
* `@Module` : Définit un regroupement logique de composants (contrôleurs, services) et gère leur cycle de vie ainsi que l'injection de dépendances au sein de ce périmètre.
* `@Controller` : Marque une classe comme responsable de la gestion des requêtes HTTP entrantes, définissant les routes et validant les payloads.
* `@Service` : Déclare une classe contenant la logique métier (Business Logic), injectable dans d'autres composants.
* `@WebSocketGateway` : Spécialise une classe pour la gestion des événements temps réel (WebSockets), agissant comme un point d'entrée pour les communications bidirectionnelles.




* **Séparation des Responsabilités (Separation of Concerns)**
* L'application applique strictement le modèle en couches **Controller-Service-Repository** pour isoler les responsabilités :
* **Couche Controller / Gateway :** Agit comme point d'entrée. Elle valide les données, gère la sécurité (authentification) et transforme les réponses, mais ne contient aucune logique métier complexe.
* **Couche Service :** Cœur de l'application. Elle contient l'algorithme de matchmaking, la gestion de la file d'attente et les règles métier. Elle est agnostique du protocole de transport (HTTP ou WS).
* 
**Couche Repository :** Responsable de l'abstraction de l'accès aux données, qu'elles soient volatiles (mémoire/Redis pour la file) ou persistantes (SQLite pour l'historique).



### 2. Organisation Modulaire

L'application est structurée autour d'une hiérarchie de modules distincts. Chaque module encapsule un ensemble cohérent de fonctionnalités, garantissant un couplage faible et une cohésion forte au sein du code source.

* **AppModule (Root)**
* **Rôle :** Module racine et point d'entrée de l'application.
* **Responsabilités :** Il orchestre le démarrage du service en important les sous-modules fonctionnels. C'est également à ce niveau que sont configurés et injectés les **providers globaux** transverses, tels que le `LoggerService` (pour la centralisation des logs) et le `ConfigService` (pour le chargement sécurisé des variables d'environnement et des secrets Vault). Il assure l'initialisation de l'arbre d'injection de dépendances.


* **MatchmakingModule**
* **Rôle :** Noyau fonctionnel du service ("Core Domain").
* **Responsabilités :** Ce module contient l'intelligence métier pure. Il expose les Contrôleurs et Gateways qui reçoivent les demandes des utilisateurs. C'est ici que réside le `MatchmakingService`, responsable de la boucle principale (Game Loop), de l'exécution de l'algorithme de tri par ELO, et de la gestion des règles d'élargissement de recherche (Bucket Expansion).


* **QueueModule**
* **Rôle :** Abstraction de la persistance et des structures de données.
* **Responsabilités :** Ce module est exclusivement dédié à la gestion technique de la liste des joueurs en attente. Il isole la logique de stockage derrière une interface générique (Repository Pattern).
* **Avantage architectural :** Cette séparation permet de rendre la logique métier agnostique du support de stockage. Actuellement implémenté avec des structures en mémoire (In-Memory) pour la performance, ce module pourra évoluer vers une solution distribuée (ex: Redis) pour permettre le scaling horizontal, sans qu'aucune modification ne soit nécessaire dans le `MatchmakingModule`.


* **CommunicationModule**
* **Rôle :** Passerelle d'échange avec l'écosystème Microservices.
* **Responsabilités :** Il centralise toutes les interfaces de communication sortantes.
* **HTTP :** Il configure et fournit les clients HTTP (Axios/Fetch) pré-configurés (Timeouts, Headers d'auth) pour interagir avec les API REST des services **Game** et **User**.
* **Events :** Il gère la connexion et la configuration du client **RabbitMQ**, permettant au service de souscrire aux événements externes et de publier ses propres mises à jour d'état.



### 3. Composants Clés et Rôles

L'architecture interne du service s'articule autour de quatre composants majeurs, chacun ayant une responsabilité unique dans le cycle de vie d'une demande de matchmaking.

* **MatchmakingController (`@Controller`)**
* **Rôle :** Interface de gestion et de monitoring (HTTP/REST).
* **Fonctionnalités :**
* Il expose les endpoints synchrones nécessaires à l'administration et à l'observabilité du système (ex: `GET /health` pour les sondes Kubernetes, `GET /metrics` pour le scraping Prometheus).
* Il peut fournir des endpoints de débogage pour visualiser l'état de la file (ex: `GET /queue/count`).


* **Validation :** Il assure la première ligne de défense en validant strictement les **DTOs (Data Transfer Objects)** entrants via des schémas (Zod/JSON Schema). Toute requête malformée est rejetée avant même d'atteindre la couche service.


* **MatchmakingGateway (`@WebSocketGateway`)**
* **Rôle :** Interface de communication temps réel avec les joueurs.
* **Fonctionnalités :**
* Il gère le cycle de vie des connexions persistantes (Handshake, Keep-Alive).
* **Écoute :** Il intercepte les événements clients tels que `join_queue` (demande d'entrée) et `leave_queue` (annulation).
* **Émission :** Il est responsable de notifier les clients via l'événement `match_found` contenant les détails de la partie.


* **Gestion des déconnexions :** Il implémente le hook `handleDisconnect`. Si un socket se ferme brutalement (crash client, perte réseau), le Gateway déclenche immédiatement le nettoyage du joueur associé via le Service, évitant ainsi de matcher un joueur "fantôme".


* **MatchmakingService (`@Service`)**
* **Rôle :** Cœur de la logique métier (Business Logic).
* **Fonctionnalités :**
* Il orchestre le processus d'ajout et de retrait des joueurs dans la file.
* **Game Loop (Ticker) :** Il exécute une boucle périodique (ex: toutes les 1000ms) qui déclenche l'analyse de la file d'attente.
* **Algorithme d'Appariement :** Il contient la logique de comparaison des ELOs et implémente la stratégie de **"Bucket Expansion"**. À chaque cycle, il élargit progressivement les critères de recherche pour les joueurs en attente depuis longtemps, garantissant qu'un match finisse toujours par être trouvé.




* **QueueRepository (ou Stockage)**
* **Rôle :** Abstraction de l'accès aux données (Data Access Layer).
* **Fonctionnalités :**
* Il fournit une interface générique pour manipuler la structure de données : `add(player)`, `remove(player)`, `findMatch(criteria)`.


* **Stratégie de Stockage :**
* **Données Chaudes (Active Queue) :** Pour des raisons de performance critique (latence minimale et haute fréquence d'écriture), la liste des joueurs en attente est stockée **en mémoire (In-Memory)** au sein de l'instance du service.
* **Données Froides (Logs) :** Le Repository peut interagir asynchrone avec **SQLite** pour archiver les logs d'audit des matchs créés, mais la file active ne persiste pas sur disque pour éviter les goulots d'étranglement d'I/O.



### 4. Cycle de Vie d'une Requête (Request Lifecycle)

Le traitement d'une demande au sein du service suit un cheminement linéaire et standardisé, garantissant que chaque étape (validation, sécurité, métier) est respectée avant toute modification de l'état du système. Voici le détail du flux pour une action typique (ex: `join_queue`).

1. **Entrée (Ingress)**
* **Point d'entrée :** La requête arrive soit sous forme d'appel HTTP (intercepté par le `MatchmakingController`), soit sous forme de message WebSocket (intercepté par le `MatchmakingGateway`).
* **Rôle :** La couche de présentation identifie la route ou l'événement ciblé et initie le contexte d'exécution.


2. **Validation et Sécurité (Guard & Pipes)**
* **Schéma :** Avant même d'atteindre le contrôleur, le payload (corps de la requête) est soumis à une validation stricte via des schémas **Zod**.
* **Fail Fast :** Si les données ne sont pas conformes (ex: `mode` de jeu invalide ou `powerups` manquant), une exception est levée immédiatement (HTTP 400 ou erreur WS), protégeant la logique métier des données corrompues.
* **Authentification :** Le décorateur de sécurité vérifie la validité du Token JWT et extrait l'identité de l'utilisateur (`userId`) pour l'injecter dans le contexte de la requête.


3. **Traitement Métier (Service Layer)**
* **Délégation :** Une fois la requête assainie, le contrôleur appelle la méthode appropriée du `MatchmakingService` (ex: `service.joinQueue(user, criteria)`).
* **Logique :** C'est ici que s'appliquent les règles métier : vérification que l'utilisateur n'est pas déjà dans la file, calcul de son ELO initial, détermination de sa priorité.


4. **Persistance de l'État (Repository Layer)**
* **Mutation :** Le service ne stocke rien lui-même ; il demande au `QueueRepository` d'ajouter l'utilisateur à la structure de données.
* **Abstraction :** Le repository exécute l'opération d'écriture (ex: `activeQueue.push(player)` en mémoire).


5. **Réponse et Sortie (Egress)**
* **Feedback :**
* Pour une requête HTTP, une réponse standard (200 OK ou 201 Created) est renvoyée au client pour confirmer la prise en compte.
* Pour un WebSocket, un événement d'acquittement (ACK) ou une notification de succès (`queue_joined`) est émis vers le client.


* **Effets de bord :** Si l'ajout de ce joueur complète une paire immédiatement, le service peut déclencher une notification asynchrone supplémentaire (`match_found`) dans la foulée.



### 5. Gestion des Erreurs et Logs

Afin de garantir la stabilité du service et la facilité d'exploitation, une stratégie centralisée de gestion des erreurs et de journalisation est mise en place.

* **Filtre d'Exception Global (Global Exception Filter)**
* **Centralisation :** Le service n'implémente pas de blocs `try/catch` répétitifs dans chaque méthode. Au lieu de cela, il utilise un **Global Error Handler** au niveau de l'application Fastify. Ce composant intercepte toutes les exceptions non gérées qui remontent de la couche Service ou Controller.
* **Assainissement :** Le filtre est responsable de transformer les erreurs techniques (stack traces, erreurs de base de données) en réponses standardisées et sécurisées pour le client.
* **HTTP :** Il mappe les erreurs métier (ex: `PlayerAlreadyQueuedException`) vers des codes HTTP appropriés (409 Conflict) et capture les erreurs imprévues en 500 Internal Server Error, sans jamais exposer de détails sensibles.
* **WebSocket :** Il capture les erreurs survenant dans les Gateways et renvoie des messages d'erreur JSON formatés (`{ "event": "error", "code": "..." }`) ou ferme le socket avec un code de statut spécifique (ex: 4000) si l'erreur est critique.




* **Logging Structuré (ELK Compatible)**
* **Format JSON :** Contrairement aux logs textuels traditionnels, le service émet exclusivement des logs au format **JSON structuré** sur la sortie standard (`stdout`). Ce format est impératif pour permettre l'ingestion et le parsing automatique par **Logstash** ou **Filebeat**.
* **Contenu enrichi :** Chaque entrée de log contient non seulement le message, mais aussi des métadonnées contextuelles pour faciliter le traçage dans **Kibana** :
* `level` : Niveau de sévérité (info, warn, error).
* `service` : Nom du microservice (`matchmaking-service`).
* `traceId` : Identifiant de corrélation (pour suivre une requête à travers plusieurs services).
* `userId` : Identifiant de l'utilisateur concerné (si authentifié).


* **Intégration DevOps :** Cette stratégie répond directement aux exigences du module "Infrastructure Setup with ELK", assurant que chaque événement du cycle de vie du matchmaking (entrée en file, match créé, erreur critique) soit indexé et consultable.



### 6. Configuration et Environnement

La gestion de la configuration de l'application suit les principes du "Twelve-Factor App", assurant une stricte séparation entre le code et la configuration. Cette stratégie est divisée en deux volets distincts pour garantir à la fois la flexibilité du déploiement et la sécurité des données sensibles.

* **Gestionnaire de Configuration (`ConfigService`)**
* **Abstraction :** L'accès aux variables d'environnement n'est jamais effectué directement via `process.env` dans le code métier. Le service utilise un `ConfigService` centralisé (injectable via le système de DI).
* **Validation au Démarrage :** Ce service est responsable de charger les variables non sensibles (Port d'écoute, Niveau de log, URL publique) via des fichiers `.env` (en développement) ou des variables d'environnement système (en production). Il valide la présence et le format de ces variables (via **Zod**) dès le démarrage de l'application. Si une variable obligatoire manque, le service refuse de démarrer, prévenant ainsi les erreurs d'exécution tardives.


* **Injection Sécurisée des Secrets (HashiCorp Vault)**
* **Intégration Cybersécurité :** Conformément aux exigences du module "Cybersecurity", aucun secret (mots de passe, clés privées, tokens) n'est stocké dans les fichiers de configuration ou le dépôt Git.
* **Bootstrap Sécurisé :** L'application intègre une phase de pré-démarrage (Bootstrap) qui s'interface avec **HashiCorp Vault**.
1. Le conteneur s'authentifie auprès de Vault via un rôle machine (AppRole).
2. Il récupère dynamiquement les secrets critiques en mémoire :
* **Credentials RabbitMQ :** URI de connexion et mot de passe pour le bus d'événements.
* **Clés API :** Tokens nécessaires pour communiquer avec le backend du *Game Service*.
* **Secrets JWT :** Clés publiques/privées pour la validation des tokens utilisateurs.




* **Injection :** Ces valeurs sont injectées dans le `ConfigService` uniquement dans la mémoire vive du processus (RAM). Elles ne sont jamais écrites sur le disque, garantissant qu'une compromission du système de fichiers ne révèle pas les clés d'infrastructure.