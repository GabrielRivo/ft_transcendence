# Interfaces de Communication : REST & WebSockets

### 1. Protocoles et Authentification

Le service implémente une stratégie de sécurité "Dual-Stack" pour supporter à la fois les joueurs inscrits (persistants) et les invités (éphémères).

*   **Sécurité des Transports :** HTTPS et WSS (WebSocket Secure) sont obligatoires. Aucune communication en clair.

*   **Configuration Proxy (NGINX) :**
    *   **Bypass Auth Request :** Contrairement aux autres microservices, les routes `/api/tournament` et `/api/game` **ne doivent pas** être protégées par le module `auth_request` de NGINX.
    *   **Raison :** NGINX rejetterait systématiquement les joueurs invités (sans cookie JWT). Le filtrage de sécurité est donc entièrement délégué à la couche applicative (`OptionalAuthGuard` et `GameGateway`).

*   **Stratégie d'Identification Hybride :**
    *   **Architecture :** Utilisation d'un `OptionalAuthGuard` personnalisé sur les routes Tournament.
    *   **Mode "Registered" (Utilisateur Inscrit) :**
        *   Authentification via **JWT** (transmis via Cookie `accessToken` ou Header `Authorization`).
        *   Le backend extrait et vérifie le token manuellement (puisque NGINX ne le pré-vérifie plus).
        *   Permet l'historisation des statistiques.
    *   **Mode "Guest" (Invité - Mandatory Part) :**
        *   Absence de token valide.
        *   Le joueur est identifié par un **Alias** (fourni dans le Body/Handshake) et un **SessionID** (généré par le serveur ou UUID stocké côté client).
        *   Portée limitée à la durée du tournoi (pas de persistance long terme).

*   **Validation des Données :**
    *   Tous les payloads entrants sont validés par `my-class-validator` (DTOs).
    *   Les alias invités sont assainis (longueur, caractères interdits) pour éviter les abus ou l'injection.

### 2. API REST (Gestion du Cycle de Vie)

Ces endpoints sont utilisés pour créer, configurer et récupérer l'état statique des tournois.

#### 2.1 Création et Configuration

*   **Endpoint :** `POST /api/tournaments`
*   **Description :** Crée une nouvelle instance de tournoi (Lobby vide).
*   **Body (DTO) :**
    ```json
    {
      "name": "Midnight Cup",
      "size": 4 | 8 | 16,
      "private": false, // Si true, nécessite un code ou lien direct
      
      // Configuration du Démarrage
      "startMode": "MANUAL" | "AUTO_FULL" | "AUTO_TIMER",
      "startDate": "2024-12-25T20:00:00Z", // Requis si AUTO_TIMER
      
      // Info Créateur (si Invité)
      "creatorAlias": "Organisateur" // Optionnel si Authentifié via JWT
    }
    ```
*   **Réponse :**
    ```json
    {
      "id": "uuid-v4",
      "joinCode": "ABCD", // Pour inviter des amis
      "adminSecret": "xyz..." // (Optionnel) Pour gérer le tournoi si invité
    }
    ```

*   **Endpoint :** `POST /api/tournaments/:id/start`
*   **Description :** Force le lancement du tournoi (Transition `PENDING` -> `IN_PROGRESS`).
*   **Déclenchement selon le mode :**
    *   `MANUAL` : Appel explicite par le créateur via ce endpoint.
    *   `AUTO_FULL` : Appel automatique par le backend (système) dès que le N-ième joueur rejoint (Hook dans `ParticipantService`).
    *   `AUTO_TIMER` : Appel automatique par un Job Scheduler (Cron/Timeout) à `startDate`.
*   **Restrictions :**
    *   Réservé au **Créateur** (vérifié via `userId` ou `adminSecret`) ou au **Système**.
    *   Condition stricte : **Minimum 4 joueurs** inscrits (sinon erreur 400 ou Annulation Timer).
    *   Si `startMode` était `AUTO_TIMER`, cette action force un démarrage anticipé.
*   **Réponse :** `200 OK` (Le tournoi démarre, les sockets reçoivent l'event `tournament_started`).



#### 2.2 Consultation

Ces endpoints sont publics (lecture seule) ou protégés selon la confidentialité du tournoi.

*   **Endpoint :** `GET /api/tournaments`
*   **Description :** Recherche et liste les tournois.
*   **Query Params :**
    *   `status` : `PENDING` (défaut), `IN_PROGRESS`, `FINISHED`.
    *   `search` : Filtre par nom (ex: "Midnight").
    *   `page` / `limit` : Pagination (défaut: page 1, limit 20).
*   **Réponse :**
    ```json
    {
      "data": [
        { "id": "...", "name": "...", "size": 8, "playersJoined": 5, "status": "PENDING" }
      ],
      "meta": { "total": 42, "page": 1 }
    }
    ```

*   **Endpoint :** `GET /api/tournaments/:id`
*   **Description :** Récupère l'état complet pour un affichage initial ou un refresh (F5).
*   **Détail :** Inclut la liste des participants, la configuration, et surtout l'arbre complet (`bracket`).
*   **Réponse :** Retourne l'objet `Tournament` complet (voir Structure de Données).

*   **Endpoint :** `GET /api/tournaments/user/:userId/history`
*   **Description :** Retourne l'historique des tournois joués par un utilisateur authentifié.
*   **Sécurité :** Accessible uniquement par l'utilisateur lui-même ou un admin.
*   **Réponse :**
    ```json
    [
      {
        "tournamentId": "...",
        "name": "...",
        "rank": 1, // Vainqueur
        "date": "2024-05-20"
      }
    ]
    ```



### 3. API WebSocket (Le Lobby & Le Live)

Le WebSocket est utilisé pour synchroniser l'état du lobby et informer les joueurs de l'avancement de l'arbre en temps réel.

#### 3.1 Connexion et Room (Handshake & Join)

Le WebSocket est le canal vital pour le temps réel. Il nécessite une phase d'identification initiale lors de la connexion.

*   **Namespace :** `/tournament` (ex: `ws://host/tournament`)
*   **Handshake (Authentification) :**
    *   Le client doit envoyer ses crédentials dans l'objet `auth` de Socket.IO lors de la connexion.
    *   **Utilisateur Inscrit :** `{ "token": "jwt_string" }` (ou via Cookie).
    *   **Invité :** `{ "alias": "Pseudo", "guestId": "uuid-persistant" }`.
*   **Event : `join_room` (Client -> Serveur)**
    *   **Payload :** `{ "tournamentId": "uuid" }`
    *   **Comportement Serveur :**
        1.  Vérifie que le tournoi existe.
        2.  Associe le Socket à la Room Socket.IO `tournament:uuid`.
        3.  Si le joueur est déjà un participant (reconnu via UserID ou GuestID), il est marqué comme "Connecté".
        4.  Émet immédiatement un `lobby_update` pour signaler sa présence.



#### 3.2 Événements Entrants (Client -> Serveur)

Ces messages permettent au client d'interagir avec l'état du tournoi.

*   **Event : `leave_room`**
    *   **Payload :** `{ "tournamentId": "uuid" }`
    *   **Action :** Si le tournoi est `PENDING`, le joueur est désinscrit et libère sa place. S'il est `IN_PROGRESS`, cela peut être considéré comme un abandon (Forfait).

*   **Event : `player_ready` (Acquittement de Match)**
    *   **Contexte :** Lorsque le serveur notifie un `match_ready`, il attend une confirmation de présence avant de considérer le joueur comme actif.
    *   **Payload :** `{ "tournamentId": "uuid", "matchId": "m_xyz" }`
    *   **Logique Serveur :**
        1.  Marque le joueur comme "Prêt" pour ce match spécifique.
        2.  Si les deux adversaires sont prêts, le serveur peut envoyer un signal `start_game_now` (ou simplement laisser le Game Service gérer le timeout de connexion).
        3.  *Timeout :* Si pas de `player_ready` reçu sous 30 secondes après la notification, le joueur peut être considéré AFK.



#### 3.3 Événements Sortants (Serveur -> Client)

Ces événements pilotent l'interface utilisateur (Reactive UI).

*   **Event : `lobby_update`**
    *   **Déclencheur :** Changement dans la liste des inscrits (Join/Leave).
    *   **Payload :**
        ```json
        {
          "count": 3,
          "max": 4,
          "participants": [
            { "id": "u1", "alias": "Neo", "avatar": "..." },
            { "id": "u2", "alias": "Morpheus", "avatar": "..." }
          ]
        }
        ```

*   **Event : `tournament_started`**
    *   **Déclencheur :** Le tournoi passe à l'état `IN_PROGRESS`.
    *   **Action UI :** Basculer immédiatement de la vue "Lobby" à la vue "Bracket" (Arbre).

*   **Event : `bracket_update`**
    *   **Déclencheur :** Fin d'un match ou changement de structure.
    *   **Payload :** L'objet `Tournament` complet (ou juste le sous-objet `bracket`).
    *   **Action UI :** Rafraîchir le composant graphique de l'arbre.

*   **Event : `match_ready`**
    *   **Déclencheur :** Le système a déterminé le prochain match pour ce socket spécifique.
    *   **Cible :** Unicast (envoyé uniquement aux 2 joueurs concernés).
    *   **Payload :**
        ```json
        {
          "matchId": "m_1",
          "gameId": "ext_game_uuid",
          "opponent": { "alias": "Smith" },
          "expiresIn": 30 // Secondes pour accepter
        }
        ```
    *   **Action UI :** Afficher une modale impérative "Votre match est prêt !". Bouton "Y aller" qui redirige vers `/game/:gameId`.

*   **Event : `tournament_ended`**
    *   **Déclencheur :** Le vainqueur final est connu.
    *   **Payload :**
        ```json
        {
          "winner": { "alias": "Neo", "id": "u1" },
          "podium": [ ... ]
        }
        ```
    *   **Action UI :** Afficher l'animation de victoire et les confettis.


### 4. Modèles de Données (DTOs)

Définition des structures partagées (Interfaces TypeScript).

#### 4.1 Entités Principales

```typescript
// Représentation publique d'un participant
export interface ParticipantDTO {
  id: string;           // UUID (User ou Guest)
  alias: string;        // "Neo"
  avatar?: string;      // URL (si User)
  isGuest: boolean;
  status: 'active' | 'eliminated' | 'disqualified';
}

// Représentation d'un Match dans l'arbre
export interface MatchDTO {
  id: string;           // Internal Match UUID
  round: number;        // 1, 2...
  player1Id: string | null; // null si en attente du round précédent
  player2Id: string | null;
  winnerId: string | null;
  score: [number, number] | null; // [11, 4]
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed';
  gameId?: string;      // ID externe GameService (si scheduled/in_progress)
}

// L'objet Tournoi complet (Réponse GET /:id)
export interface TournamentDTO {
  id: string;
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  size: 4 | 8 | 16;
  currentRound: number;
  participants: ParticipantDTO[];
  matches: MatchDTO[]; // Liste plate de tous les matchs
  winnerId?: string;
}
```

#### 4.2 DTOs d'Entrée (Body)

```typescript
export interface CreateTournamentDTO {
  name: string;
  size: 4 | 8 | 16;
  private?: boolean;
  startMode: 'MANUAL' | 'AUTO_FULL' | 'AUTO_TIMER';
  startDate?: string;   // ISO Date
  creatorAlias?: string;
}

export interface JoinTournamentDTO {
  alias?: string;       // Requis pour les invités
}
```

### 5. Codes d'Erreur (Standardisés)

Le service retourne des objets d'erreur structurés : `{ "statusCode": 4xx, "error": "Type", "message": "Detail", "code": "APP_CODE" }`.

#### 5.1 Erreurs d'Inscription
*   `TOURNAMENT_FULL` (409) : La capacité maximale (4/8/16) est atteinte.
*   `ALREADY_JOINED` (409) : L'utilisateur ou l'alias est déjà présent dans ce tournoi.
*   `ALIAS_TAKEN` (409) : L'alias demandé est déjà utilisé par un autre invité.
*   `ALREADY_STARTED` (403) : Impossible de rejoindre, le tournoi a déjà commencé (`IN_PROGRESS`).

#### 5.2 Erreurs de Gestion
*   `NOT_CREATOR` (403) : Seul le créateur peut lancer ou annuler le tournoi.
*   `NOT_ENOUGH_PLAYERS` (400) : Tentative de `/start` avec moins de 4 joueurs.
*   `INVALID_STATE` (400) : Action impossible dans l'état actuel (ex: `/start` sur un tournoi `FINISHED`).

#### 5.3 Erreurs Temps Réel (WebSocket)
*   `AUTH_REQUIRED` : Connexion refusée (Token invalide ou Alias manquant).
*   `DISQUALIFIED` : Notification push si le joueur est exclu pour timeout.
*   `MATCH_NOT_FOUND` : Tentative d'envoyer `player_ready` pour un match qui n'existe plus.
