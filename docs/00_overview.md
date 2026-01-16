# Vue d'ensemble du Service de Tournoi

### 1. Introduction

- **Définition :** Le service `tournament` est l'orchestrateur des compétitions multi-joueurs. Il agit comme un "Maître du Jeu" administratif.
- **Philosophie :** Il délègue la gestion du gameplay (physique de la balle, scores en temps réel) au _Game Service_ pour se concentrer exclusivement sur l'organisation structurelle : définition des rencontres et progression dans l'arbre du tournoi.
- **Contexte :** Ce service couvre les exigences de la partie mandataire (Système de tournoi multi-joueurs, Alias) et s'intègre aux modules majeurs (Gestion des utilisateurs, Historique des matchs).

### 2. Responsabilités Principales

Liste des missions critiques du service, qui garantissent l'intégrité et le bon déroulement de la compétition.

- **Gestion du Cycle de Vie (Lifecycle Management) :**
  - **Création & Configuration :** Définition des règles (nombre de joueurs, visibilité).
  - **Inscription (Lobby) :** Gestion de la salle d'attente, validation des participants (alias ou authentifiés), gestion du quorum pour démarrer.
  - **Déroulement & Clôture :** Orchestration des phases de jeu jusqu'à la détermination du vainqueur final.

- **Gestion de l'Arbre de Tournoi (Bracket System) :**
  - **Génération Structurelle :** Création dynamique de l'arbre des rencontres (Matchups) pour le premier round (support des bye/exemptions si nombre de joueurs impair).
  - **Progression Automatique :** Analyse des résultats de match pour faire avancer les vainqueurs vers les rounds suivants sans intervention manuelle.
  - **Gestion des Cas Limites :** Forfaits, disqualifications ou déconnexions entraînant une victoire par défaut.

- **Persistance et Résilience de l'État :**
  - **Atomicité :** Sauvegarde critique de l'état du tournoi à chaque transition significative (ex: fin d'un match).
  - **Reprise après Panne (Recovery) :** En cas de redémarrage du serveur, capacité à restaurer le tournoi exactement là où il s'était arrêté, sans perte de données.

- **Diffusion en Temps Réel (Broadcasting) :**
  - **Flux d'événements :** Notification proactive via WebSocket aux participants et spectateurs pour tout changement d'état (nouveau round, score final d'un match, vainqueur global).
  - **Visibilité :** Mise à jour instantanée de la vue de l'arbre sur le Frontend.

### 3. Périmètre Fonctionnel (Scope)

Ce service est conçu selon le principe de responsabilité unique. Il se concentre strictement sur l'organisation des tournois et délègue les autres fonctionnalités aux services spécialisés.

#### Dans le périmètre (In-Scope)

- **Gestion des participants :** Support hybride pour les Alias temporaires (Mode Mandatory) et les Utilisateurs authentifiés (Mode User Management).
- **Arbitrage administratif :** Gestion des règles de disqualification, forfaits, et validation des scores finaux.
- **Historisation :** Stockage des arbres de tournois terminés et des résultats finaux (Vainqueur).

#### Hors périmètre (Out-of-Scope) et Délégations

- **Matchmaking 1v1 (Ranked/Queue) :**
  - La recherche d'adversaire aléatoire est la responsabilité exclusive du **Service Matchmaking**.
  - Le Service Tournoi ne gère pas de "file d'attente" au sens ELO/Ranked, mais des "Lobbies" déterministes.

- **Simulation du Jeu (Gameplay) :**
  - Toute la physique (balle, raquettes, collisions) et le calcul des scores en temps réel sont gérés par le **Service Game**.
  - Le Service Tournoi est agnostique du gameplay : il instancie une partie via l'API du Game Service et attend un événement de fin (`GameFinished`).

- **Interactions Sociales & Chat :**
  - La messagerie instantanée, la gestion des amis et les invitations directes relèvent du **Service Chat**.
  - Bien que le tournoi puisse émettre des notifications système (ex: "Tournoi complet"), les échanges entre joueurs ne transitent pas par ce service.

### 4. Interactions avec les autres services

Ce service s'intègre dans une architecture microservices événementielle pour garantir le découplage et la résilience.

- **Service Game :**
  - **Commande (Synchrone) :** Le Tournoi demande la création d'une partie via HTTP `POST /games` pour obtenir l'ID de session immédiatement.
  - **Écoute (Asynchrone) :** Le Tournoi s'abonne à l'événement RabbitMQ `game.finished` publié par le Service Game. Cela garantit que le résultat est traité même si le service Tournoi redémarre à ce moment précis (Message Persistence).

- **Service Stats / User Management :**
  - **Vérification Optimisée :** Pour l'inscription, le service se base sur les données certifiées du token JWT (via `@JWTBody`), évitant un appel API redondant pour l'utilisateur courant.
  - **Mise à jour (Asynchrone) :** Le Tournoi publie un événement `tournament.finished` (contenant les stats) que le Service dédié aux Statistiques (ou User) écoute pour mettre à jour les historiques et profils.

- **Frontend (SPA) :**
  - **Protocole : WebSocket Secure (WSS)**
  - Le frontend se connecte via WebSocket pour recevoir l'état du tournoi en temps réel.
  - **Implémentation Technique :** Utilisation des décorateurs `my-fastify-decorators` :
    - `@WebSocketGateway()` pour définir la gateway.
    - `@SubscribeConnection()` pour gérer les connexions entrantes.
    - `@JWTBody()` pour extraire et valider le token utilisateur dès le handshake.
    - `@ConnectedSocket()` pour accéder à l'instance socket et y stocker le contexte de session.
  - **Flux Optimisé (Delta Updates) :**
    - **Initialisation :** Le client télécharge l'arbre complet (`Full State`) à la connexion.
    - **Mises à jour :** Pour éviter la saturation réseau sur les gros tournois, le serveur envoie uniquement les modifications (`Patch Events`) :
      - `MatchUpdated` : Changement de statut ou de vainqueur d'un match spécifique.
      - `RoundStarted` : Ouverture d'un nouveau round.
    - **Implications Frontend :** Le store (ex: React Context/Redux) doit être capable d'appliquer ces patchs localement sans re-fetcher tout l'objet, nécessitant une gestion d'état immuable rigoureuse pour garantir la cohérence visuelle.

### 5. Stratégie "Alias vs Comptes" (Polymorphisme)

Le sujet impose une contrainte forte : le système doit fonctionner **sans** comptes (Mandatory) ET **avec** comptes (Module User Management). Pour éviter de dupliquer la logique, nous utilisons une abstraction polymorphique du participant.

- **Entité Unifiée `Participant` :**
  Toute la logique interne du tournoi (matchmaking, avancement, vainqueur) manipule exclusivement cette interface générique.

  ```typescript
  interface Participant {
  	id: string; // UUID (soit généré temporairement, soit ID utilisateur BDD)
  	displayName: string; // Alias saisi ou Pseudo du profil
  	kind: 'GUEST' | 'REGISTERED';
  	metadata?: {
  		// Extensible selon le type
  		avatarUrl?: string;
  		realUserId?: string; // Lien vers User Service si REGISTERED
  	};
  }
  ```

- **Mode Invite (Mandatory) :**
  - **Flux :** L'utilisateur saisit manuellement une liste d'alias (ex: "Paul", "Pierre").
  - **Création :** Le service génère des `Participants` volatils (`kind: 'GUEST'`) avec des UUIDs éphémères.
  - **Persistance :** Ces participants n'existent que dans le scope JSON du tournoi. Ils disparaissent une fois le tournoi archivé.

- **Mode Authentifié (Module) :**
  - **Flux :** L'utilisateur rejoint via son compte.
  - **Création :** Le service instancie un `Participant` (`kind: 'REGISTERED'`) en utilisant l'ID et le Pseudo réels provenant du JWT/Service User.
  - **Avantage :** Permet de mixer des joueurs invités et authentifiés dans le même arbre si besoin, ou de migrer facilement d'un mode à l'autre sans réécrire le moteur de jeu.

### 6. Stack Technique & Infrastructure

Conformément aux contraintes du projet et pour garantir la performance.

- **Langage & Framework :**
  - **Runtime :** Node.js avec **TypeScript** (Typage strict pour gérer la complexité des arbres).
  - **Framework Web :** **Fastify** (imposé par le module Web Backend), utilisé avec `my-fastify-decorators` pour une architecture type Injection de Dépendances.

- **Base de données :**
  - **Technologie :** **SQLite** (imposé par le module Database).
  - **Usage :** Stockage relationnel simple pour les métadonnées (ID, status, dates) mais utilisation intensive de colonnes `JSON` pour stocker la structure de l'arbre (Brackets). Cela permet de sauvegarder l'état complet du tournoi en une seule transaction atomique sans jointures complexes.

- **Communication & Protocoles :**
  - **REST API (HTTPS) :** Pour toutes les opérations CRUD (Créer, Lister, Supprimer) et les appels inter-services synchrones.
  - **WebSocket (WSS) :** Exclusivement pour le push temps réel vers les clients Frontend (Mises à jour de l'arbre).
  - **Message Broker (RabbitMQ) :** Pour la réception asynchrone et résiliente des événements de fin de partie (`game.finished`).

- **Infrastructure :**
  - **Conteneurisation :** Docker (Image Node.js Alpine optimisée).
