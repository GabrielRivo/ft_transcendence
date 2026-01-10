# Interfaces de Communication : REST & WebSockets

### 1. Protocoles et Authentification

Définition des standards de communication pour le service Tournoi.

* 
**Sécurité des Transports :** HTTPS et WSS obligatoires.


* **Stratégie d'Identification Hybride :**
* **Mode "Module User" :** Authentification via JWT (Header `Authorization`). Le `userId` est extrait du token.
* **Mode "Mandatory" (Invité) :** Pas de token JWT. Le joueur fournit un `alias` lors de la connexion WebSocket. Le serveur génère un ID de session temporaire.


* **Validation :** Tous les payloads JSON sont validés par des schémas stricts (Zod) avant traitement.

### 2. API REST (Gestion du Cycle de Vie)

Ces endpoints sont utilisés pour créer, configurer et récupérer l'état statique des tournois.

#### 2.1 Création et Configuration

* `POST /api/tournaments`
* **Description :** Crée une nouvelle instance de tournoi (Lobby vide).
* **Body :**
```json
{
  "size": 4 | 8 | 16,
  "name": "Super Tournament",
  "private": boolean // (Si true, pas listé publiquement)
}

```


* **Réponse :** `{ "id": "uuid", "joinCode": "ABCD" }`


* `POST /api/tournaments/:id/start`
* **Description :** Le propriétaire (Creator) lance le tournoi. Verrouille les inscriptions et génère l'arbre.
* **Condition :** Le lobby doit être plein.



#### 2.2 Consultation

* `GET /api/tournaments`
* **Query Params :** `?status=PENDING` (pour trouver des tournois à rejoindre).
* **Description :** Liste les tournois publics ouverts.


* `GET /api/tournaments/:id`
* **Description :** Récupère l'état complet (JSON Tree) pour un affichage initial ou en cas de rafraîchissement de page (F5).


* `GET /api/tournaments/user/:userId/history`
* **Description :** Retourne l'historique des tournois joués par un utilisateur (Module Stats).



### 3. API WebSocket (Le Lobby & Le Live)

Le WebSocket est utilisé pour synchroniser l'état du lobby et informer les joueurs de l'avancement de l'arbre en temps réel.

#### 3.1 Connexion et Room

* **Namespace :** `/tournament`
* **Event : `join_room**`
* **Payload :** `{ "tournamentId": "uuid", "alias": "OptionalAlias" }`
* **Comportement :** Le serveur ajoute le socket à la "Room" du tournoi. Si c'est un invité, l'alias est enregistré.



#### 3.2 Événements Entrants (Client -> Serveur)

* **Event : `leave_room**`
* Le joueur quitte le lobby avant le début.


* **Event : `player_ready**` (Optionnel)
* Pour confirmer que le joueur a bien vu son prochain match.



#### 3.3 Événements Sortants (Serveur -> Client)

Ces événements pilotent l'interface utilisateur.

* **Event : `lobby_update**`
* **Déclencheur :** Un joueur rejoint ou quitte le lobby.
* **Payload :** Liste des participants actuels `["PlayerA", "PlayerB", ...]`.


* **Event : `tournament_started**`
* **Déclencheur :** Le créateur a lancé le tournoi.
* **Action UI :** Afficher la vue "Arbre de tournoi" (Bracket View).


* **Event : `bracket_update**`
* **Déclencheur :** Un match est terminé, un vainqueur avance.
* **Payload :** L'objet JSON complet de l'arbre mis à jour.


* **Event : `match_ready**`
* **Déclencheur :** Deux joueurs sont appariés pour le prochain round.
* **Cible :** Uniquement les 2 joueurs concernés.
* **Payload :**
```json
{
  "matchId": "game_uuid",
  "opponent": "AdversaireAlias",
  "action": "redirect_to_game",
  "gameUrl": "/game/play/game_uuid"
}

```




* **Event : `tournament_ended**`
* **Payload :** `{ "winner": "KingPlayer", "rankings": [...] }`



### 4. Modèles de Données (DTOs)

Exemples de structures JSON partagées.

* **TournamentTreeDTO :** Structure hiérarchique représentant les matchs.
* *Note :* Référence explicite au format utilisé par la librairie de visualisation frontend (ex: format compatible avec `react-tournament-bracket` ou structure custom).


* **ParticipantDTO :** Standardisation de l'objet joueur (id, alias, avatar, status: 'eliminated' | 'active').

### 5. Codes d'Erreur

* `TOURNAMENT_FULL` : Tentative de rejoindre un lobby complet.
* `ALREADY_STARTED` : Tentative de rejoindre un tournoi en cours.
* `DISQUALIFIED` : Notification envoyée si le joueur est exclu pour inactivité.