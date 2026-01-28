# Roadmap de Développement - Service de Matchmaking (v2)

Ce document détaille le plan de mise en œuvre du service de Matchmaking. La stratégie adoptée privilégie une approche **"Cœur de Métier d'abord"** : nous avons validé l'algorithme et la persistance (Phases 1 à 3) et nous nous concentrons désormais sur la performance et l'industrialisation.

---

### Phase 1 : Initialisation et Cœur Algorithmique (MVP Local) [TERMINÉ]
**Objectif :** Construction des fondations solides. Isolation de la logique métier pure (In-Memory) sans couche réseau complexe.

* **1.1 Structure du Projet (Boilerplate & Nettoyage)**
    * **Nettoyage :** Suppression du module d'exemple (`src/sample/`).
    * **Configuration :** TypeScript (`ES2022`), ESLint/Prettier stricts.
    * **Architecture :** Module `MatchmakingModule` et injection de dépendances.

* **1.2 Modélisation des Données (In-Memory)**
    * **Interface `QueuedPlayer` :** Typage strict (userId, socketId, elo, joinTime, rangeFactor).
    * **Service `MatchmakingService` :** Structure volatile `activeQueue` et méthodes CRUD atomiques.

* **1.3 Implémentation de la "Game Loop"**
    * **Ticker :** Boucle `setInterval` (ex: 1000ms).
    * **Algorithme "Bucket Expansion" :** Élargissement progressif de la fenêtre de recherche (`rangeFactor`) et scan linéaire pour trouver des paires (`Math.abs(elo1 - elo2) <= tolerance`).

---

### Phase 2 : Interfaces de Communication (REST & WebSocket) [TERMINÉ]
**Objectif :** Interconnexion du moteur avec les clients via WebSockets et sécurisation des entrées.

* **2.1 Interface WebSocket (`MatchmakingGateway`)**
    * **Gateway :** Gestion des événements `join_queue`, `leave_queue`.
    * **Cycle de vie :** Gestion critique de la déconnexion (`handleDisconnect`) pour éviter les "matchs fantômes".
    * **Feedback :** Notifications `queue_joined` et `match_found`.

* **2.2 Validation des Données (Zod)**
    * **DTOs :** Schémas stricts pour les payloads entrants.
    * **Fail Fast :** Rejet immédiat des requêtes malformées.

* **2.3 API REST de Base**
    * **Healthcheck :** Endpoint `/health` pour Docker/K8s.
    * **Debug :** Endpoint `/queue` pour visualiser l'état mémoire en dev.

---

### Phase 3 : Persistance et Données Froides (SQLite) [TERMINÉ]
**Objectif :** Ajout de la mémoire à long terme (historique et sanctions) via SQLite.

* **3.1 Intégration SQLite**
    * **Schéma :** Tables `matchmaking_sessions` (audit) et `penalties` (bans).
    * **Volume :** Persistance des données dans `/data`.

* **3.2 Repositories**
    * **MatchHistoryRepository :** Archivage des sessions terminées.
    * **PenaltyRepository :** Gestion des exclusions temporaires.

* **3.3 Liaison Métier**
    * **Guards :** Vérification des pénalités avant l'ajout en file (`403 Forbidden`).
    * **Archivage Async :** Écriture "Fire and Forget" des logs de match.

---

### Phase 3.5 : Optimisation "High-Performance" & UX (Transition)
**Objectif :** Cette phase charnière vise à passer d'un MVP fonctionnel à un service de production "Haut de Gamme". Elle résout les limitations de performance (complexité O(N²)) et améliore l'expérience utilisateur (anti-AFK).

* **3.5.1 Refonte Algorithmique (Partitionnement & Tri)**
    * **Optimisation de la Boucle :**
        * Remplacement de l'itération naïve par une approche optimisée.
        * *Stratégie :* Trier le tableau des candidats par ELO au début du tick ou utiliser des "Buckets" (ex: `Map<EloRange, Player[]>`) pour stopper les comparaisons dès que l'écart dépasse la tolérance max.
    * **Benchmark Interne :**
        * Création d'un script (`benchmarks/algo-perf.ts`) injectant 5 000+ joueurs fictifs pour garantir un temps de tick < 10ms.

* **3.5.2 Mécanique de "Ready Check" (Confirmation)**
    * **Nouvel État `PENDING_ACCEPT` :**
        * Modification du flux : Lorsqu'un match est trouvé, ne plus éjecter les joueurs immédiatement.
        * Envoi d'un événement `match_proposal` demandant une confirmation explicite (Pop-up "Accepter / Refuser").
    * **Gestion des Réponses :**
        * Implémentation des messages `accept_match` et `decline_match`.
        * **Timeout (15s) :** Si un joueur ne répond pas, il est considéré comme ayant refusé.
    * **Résolution :**
        * *Succès (2/2) :* Validation du match et passage à la Phase 4.
        * *Échec (1/2) :* Le joueur ayant accepté est remis en **tête de file prioritaire**. Le refuseur reçoit une pénalité mineure ou est éjecté.

* **3.5.3 Connexion Réelle au Service User**
    * **Suppression du Mock :**
        * Remplacement de la méthode mockée `getUserElo()` par un véritable appel HTTP (Axios/Fetch) vers le Service Utilisateur.
    * **Fiabilité :** Implémentation d'un timeout court (ex: 1s) et d'un fallback sécurisé en cas d'indisponibilité du service tiers.

---

### Phase 4 : Intégration Système et Événementiel
**Objectif :** Connecter le service validé et optimisé au reste de l'infrastructure distribuée.

* **4.1 Bus d'Événements (RabbitMQ)**
    * **Package Partagé :** Intégration de `@transcendence/message-broker`.
    * **Souscription :** Écoute du topic `game.finished` pour la mise à jour asynchrone des ELOs locaux.
    * **Publication :** Diffusion périodique de `matchmaking.status` (métriques temps réel) pour le dashboard admin.

* **4.2 Communication Inter-Services (Game Service)**
    * **Appel de Création (Post-Validation) :**
        * Une fois le "Ready Check" (Phase 3.5.2) validé, appel HTTP (`POST`) vers l'API du *Game Service*.
    * **Gestion des Erreurs (Rollback) :**
        * Si le Game Service échoue (500/Timeout), annuler le match et notifier les clients avec un message d'erreur explicite, sans pénalité.
    * **Handover Final :**
        * Réception du `gameId` et transmission aux clients via l'événement `match_confirmed` incluant l'URL de connexion WebSocket du jeu.

---

### Phase 5 : Infrastructure et Observabilité
**Objectif :** Industrialisation pour la production ("Production Readiness").

* **5.1 Gestion des Secrets ("Zero Trust" avec Vault)**
    * **Bootstrap :** Script de pré-démarrage récupérant les credentials (DB, RabbitMQ) depuis HashiCorp Vault.
    * **Injection Mémoire :** Aucune variable sensible stockée en clair dans l'environnement (`process.env`).

* **5.2 Logging Haute Performance (Pino)**
    * **Remplacement de Console :** Migration de `console.log` vers **Pino** pour un logging JSON asynchrone et non-bloquant.
    * **Structuration :** Logs enrichis (`traceId`, `matchId`, `durationMs`) pour ingestion par ELK/Loki.

* **5.3 Métrologie (Prometheus)**
    * **Endpoint `/metrics` :** Exposition des métriques techniques et métier.
    * **Indicateurs Clés (KPIs) :**
        * `matchmaking_tick_duration_ms` (Histogramme - critique pour la perf).
        * `matchmaking_active_users` (Jauge).
        * `matchmaking_ready_check_acceptance_rate` (Pourcentage d'acceptation des matchs).

* **5.4 Conteneurisation Finale**
    * **Sécurité :** Image distroless ou Alpine minimale, exécution en utilisateur non-root.

---

### Phase 6 : Fiabilisation et Tests (QA)
**Objectif :** Validation finale sous contrainte.

* **6.1 Tests Unitaires et d'Intégration (Jest)**
    * **Couverture Étendue :**
        * Tests spécifiques pour la logique de "Ready Check" et les Timeouts.
        * Simulation des pannes du Service User (Circuit Breaker).
    * **Isolation :** Mocks complets pour RabbitMQ et le Game Service.

* **6.2 Tests de Charge (Stress Test)**
    * **Scénario Massif :** Simulation de 1 000+ bots effectuant des cycles `join` -> `ready` -> `leave`.
    * **Validation de Performance :**
        * Vérifier que l'Event Loop Lag reste < 50ms.
        * Vérifier l'absence de fuites mémoire (Memory Leaks) sur 24h d'exécution simulée.

* **6.3 Nettoyage Final**
    * **Sanitisation :** Suppression du code mort, des TODOs et des logs de debug verveux.
    * **Documentation :** Mise à jour finale des diagrammes d'architecture pour refléter le flux de "Ready Check".