# Persistance des Données et Schémas

### 1. Stratégie de Stockage Hybride

La nature du service de Matchmaking impose une dichotomie stricte dans la gestion des données. Contrairement à une application CRUD classique, nous distinguons les données opérationnelles à haute fréquence (nécessitant une latence quasi-nulle) des données historiques (nécessitant une durabilité).

* **Données "Hot" (État Volatile et Temps Réel)**
    * **Support de Stockage :** Mémoire Vive (In-Memory / Heap Node.js) ou Redis (optionnel pour la scalabilité horizontale).
    * **Nature des Données :**
        * La file d'attente active (`QueuedPlayer[]`).
        * Les correspondances `UserId` <-> `SocketId`.
        * Les compteurs d'état temporaires (`rangeFactor`, temps d'attente actuel).
    * **Justification Technique :**
        * **Performance critique :** La boucle de matchmaking parcourt et modifie ces structures plusieurs fois par seconde. Les opérations doivent s'effectuer en complexité $O(1)$ ou $O(\log n)$. Les E/S disque (Disk I/O) d'une base de données classique seraient un goulot d'étranglement inacceptable.
        * **Cycle de vie lié au Processus :** Ces données sont intrinsèquement éphémères. Si le serveur plante, les connexions WebSocket sont coupées. Par conséquent, restaurer une file d'attente depuis le disque serait inutile, car les sockets associés ne seraient plus valides.

* **Données "Cold" (Persistance et Audit)**
    * **Support de Stockage :** **SQLite**.
    * **Contexte :** Conformément à l'architecture modulaire du projet, ce service utilise le module Database partagé (via Prisma ou TypeORM) pour stocker les données qui doivent survivre à un redémarrage.
    * **Nature des Données :**
        * **Audit Logs :** Historique des propositions de matchs générées (ex: "Le joueur A a été matché avec B à telle heure"). Utile pour le débogage et l'analyse post-mortem.
        * **Pénalités (Dodging) :** Si un mécanisme de pénalité est implémenté (ex: interdiction de jouer pendant 5 min après avoir refusé un match), cet état doit être persisté pour empêcher le joueur de contourner la sanction en rafraîchissant sa page.
        * **Configuration Dynamique :** Seuils ELO et constantes d'algorithme modifiables par les administrateurs sans redéploiement.



### 2. Schémas de Données "Hot" (In-Memory / Redis)

Cette section détaille les structures de données volatiles manipulées par le moteur de matchmaking. Ces objets résident principalement en mémoire vive (Heap) de l'instance Node.js pour garantir une latence d'accès minimale lors des itérations de la boucle de jeu.

* **Modèle Objet : `QueuedPlayer`**
    Cet objet représente l'état instantané d'un joueur dans la file. Il agit comme un "Snapshot" (instantané) des données nécessaires à la décision, isolant le processus de matchmaking des latences de la base de données principale.

```typescript
interface QueuedPlayer {
  userId: string;       // UUID v4 (Identifiant unique persistant du joueur)
  socketId: string;     // ID de connexion WebSocket (pour la communication ciblée)
  baseElo: number;      // "Snapshot" du score ELO au moment de l'inscription
                        // (On fige cette valeur pour éviter des appels DB répétés)
  joinTime: number;     // Timestamp (Date.now()) de l'entrée en file
                        // Sert de référence pour le calcul du "Range Expansion"
  priority: number;     // Score de priorité calculé (défaut: 0)
                        // Permet de gérer les cas de "Re-queue" après un échec
                        // ou de prioriser certains utilisateurs si nécessaire.
}
```

* **Structure de Collection : `ActiveQueue**`
Pour gérer efficacement la liste des candidats, nous utilisons une combinaison de structures :
1. **La Liste Ordonnée (Main Queue) :**
* **Type :** `Array<QueuedPlayer>` (ou `LinkedList` si le volume dépasse 10k utilisateurs).
* **Usage :** Stocke les joueurs triés par ordre d'arrivée (FIFO). C'est sur cette collection que la boucle de matchmaking itère.


2. **La Table de Correspondance (Lookup Map) :**
* **Type :** `Map<string, QueuedPlayer>` (Clé : `userId` ou `socketId`).
* **Usage :** Permet une vérification en complexité  pour savoir si un joueur est déjà dans la file (anti-spam) ou pour le retrouver instantanément lors d'une déconnexion, sans avoir à parcourir toute la liste.



### 3. Schémas de Données SQLite (Persistance)

Bien que le cœur du matchmaking opère en mémoire, certaines données nécessitent une persistance à long terme pour des raisons d'auditabilité, d'analyse de performance (Business Intelligence) et de modération. Ces données "froides" sont stockées dans une base relationnelle SQLite.

* **Table `matchmaking_sessions` (Logs d'Audit & Métriques)**
    Cette table agit comme un journal historique immuable. Elle ne sert pas au fonctionnement temps réel du jeu, mais est cruciale pour les équipes DevOps et Produit afin d'analyser la santé du système (ex: calcul du temps d'attente moyen, ratio d'échecs).

    | Colonne | Type | Description |
    | :--- | :--- | :--- |
    | `id` | UUID (PK) | Identifiant unique de la transaction de matchmaking. |
    | `player_1_id` | UUID | Identifiant du premier joueur (Initiateur ou Prioritaire). |
    | `player_2_id` | UUID | Identifiant du second joueur (Adversaire trouvé). |
    | `started_at` | DATETIME | Timestamp précis de l'entrée dans la file d'attente. |
    | `matched_at` | DATETIME | Timestamp de la résolution du match. <br> *Note : La différence `matched_at - started_at` fournit la métrique clé "Time to Match".* |
    | `status` | ENUM | État final de la session : <br> - `CREATED`: Match validé et envoyé au Game Service. <br> - `FAILED`: Erreur technique lors du handover. <br> - `CANCELLED`: Annulation utilisateur avant aboutissement. |

* **Table `penalties` (Gestion des Abus / Cooldowns)**
    Cette table implémente le mécanisme de sanction pour lutter contre le "Dodging" (pratique consistant à quitter une file ou refuser un match pour éviter un adversaire spécifique). Elle agit comme un filtre bloquant à l'entrée de la file.

    | Colonne | Type | Description |
    | :--- | :--- | :--- |
    | `id` | INT (PK) | Identifiant interne (Auto-increment). |
    | `user_id` | UUID | Identifiant du joueur sanctionné. |
    | `reason` | VARCHAR | Motif de la sanction (ex: "AFK", "Declined Match", "Disconnect"). |
    | `created_at` | DATETIME | Date d'application de la sanction. |
    | `expires_at` | DATETIME | Date de fin de la sanction. <br> *Logique métier :* Lors d'une tentative de `join_queue`, le système exécute une requête `WHERE user_id = ? AND expires_at > NOW()`. Si un résultat est retourné, l'accès est refusé. |



### 4. Interactions Base de Données (ORM/Query Builder)

Bien que la majorité de la logique décisionnelle s'exécute en mémoire pour des raisons de vélocité, l'interaction avec la base de données persistante (SQLite) doit être gérée avec rigueur pour ne pas introduire de latence dans la boucle d'événements (Event Loop) de Node.js.

* **Abstraction et Outillage (Repository Pattern)**
    * **Outil :** L'accès aux données est normalisé via l'utilisation d'un ORM moderne (type **Prisma** ou **TypeORM**) ou d'un Query Builder robuste.
    * **Architecture :** Le service n'exécute jamais de requêtes SQL brutes au sein de la logique métier. Toutes les interactions sont encapsulées dans des classes dédiées suivant le **Repository Pattern** (ex: `MatchHistoryRepository`, `PenaltyRepository`).
    * **Avantage :** Cette séparation des préoccupations facilite les tests unitaires (via le *mocking* des repositories) et permet de changer de moteur de base de données futur (ex: passage à PostgreSQL) sans réécrire l'algorithme de matchmaking.

* **Performance et Gestion Asynchrone (Non-Blocking I/O)**
    * **Contrainte Critique :** Les opérations d'écriture sur disque (Disk I/O) inhérentes à SQLite sont infiniment plus lentes que les opérations en mémoire vive. Une écriture bloquante pourrait geler la boucle de matchmaking et retarder le traitement de tous les autres joueurs.
    * **Stratégie "Fire and Forget" :**
        * Pour les opérations non critiques pour la suite immédiate du flux (comme l'insertion d'un log dans `matchmaking_sessions`), le service adopte une approche asynchrone découplée.
        * Concrètement, le service déclenche la promesse d'écriture sans attendre sa résolution (`await`) pour continuer l'exécution de la boucle, ou délègue cette tâche à une file de tâches interne.
    * **Priorité :** La notification des clients (WebSocket) est toujours prioritaire sur la persistance des logs.



### 5. Cycle de Vie et Nettoyage (Data Retention)

L'utilisation de SQLite (stockage fichier) impose une vigilance particulière quant à la volumétrie des données. Sans une stratégie de nettoyage active, la taille de la base de données croîtrait indéfiniment, dégradant progressivement les performances des requêtes (I/O disque) et consommant inutilement de l'espace de stockage.

* **Automate de Nettoyage (Internal CRON)**
    * **Implémentation :** Le service intègre un planificateur de tâches léger (type `node-cron` ou via `setInterval`) qui s'exécute en arrière-plan, indépendamment du flux de trafic utilisateur.
    * **Objectif :** Garantir que le service reste performant même après plusieurs mois d'activité continue, sans intervention humaine.

* **Politiques de Rétention et de Purge**
    Des règles strictes de rotation des données (Log Rotation) sont appliquées pour chaque type d'entité :

    1.  **Logs de Session (`matchmaking_sessions`)**
        * **Problème :** Cette table possède la cardinalité la plus forte (1 ligne par tentative de match).
        * **Règle :** "Fenêtre glissante" de 7 jours.
        * **Action :** Une tâche quotidienne (ex: à 04:00 AM) exécute une requête de suppression massive :
            `DELETE FROM matchmaking_sessions WHERE started_at < DATE('now', '-7 days');`
        * **Justification :** Les logs d'audit ne sont utiles que pour le débogage immédiat. L'archivage à long terme (Statistiques, Historique joueur) est la responsabilité d'autres services dédiés, pas du moteur de matchmaking.

    2.  **Pénalités Expirées (`penalties`)**
        * **Problème :** Une fois la date de fin de sanction dépassée, l'enregistrement devient obsolète et n'a plus de valeur métier.
        * **Règle :** Suppression dès expiration.
        * **Action :** Une tâche horaire nettoie les enregistrements périmés :
            `DELETE FROM penalties WHERE expires_at < DATETIME('now');`
        * **Justification :** Maintenir la table `penalties` la plus petite possible accélère la vérification d'éligibilité (`SELECT`) effectuée à chaque entrée de joueur dans la file.