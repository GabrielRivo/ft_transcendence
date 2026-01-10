# Machine à États et Workflows du Tournoi

### 1. Vue d'Ensemble de la Machine à États

Cette section définit les statuts possibles d'un tournoi. Le service agit comme une *Finite State Machine* (FSM).

* **Liste des États (Status Enum) :**
* `PENDING` : Le lobby est ouvert, les joueurs s'inscrivent.
* `STARTING` : Le créateur a lancé, le bracket est généré, en attente d'initialisation.
* `IN_PROGRESS` : Des matchs sont en cours ou en attente de démarrage.
* `COMPLETED` : Le vainqueur final est connu.
* `CANCELLED` : Annulé par l'admin ou par manque de joueurs.



### 2. Workflow Détaillé : Phase par Phase

#### 2.1 Phase d'Inscription (Lobby)

* **Action :** Les joueurs rejoignent via WebSocket ou REST.
* **Logique :**
* Vérification des doublons (Alias ou ID User).
* Vérification de la limite de taille (4, 8, 16 joueurs).
* **Event Broadcast :** À chaque `join/leave`, envoi de la liste mise à jour à tous les clients connectés au socket du tournoi.



#### 2.2 Phase d'Initialisation (Le "Shuffle")

* **Trigger :** Le créateur clique sur "Start" (ou le lobby est plein si auto-start activé).
* **Algorithme de Génération :**
* Mélange aléatoire des participants (Random Shuffle).
* Création de l'arbre binaire (Bracket) en mémoire.
* Assignation des joueurs aux "feuilles" (Slots du Round 1).
* Sauvegarde de l'état initial en Base de Données.



#### 2.3 La Boucle de Tournoi (Round Loop)

C'est le cœur du système. Il s'agit d'un cycle événementiel.

1. **Check Round Status :** Le système vérifie s'il y a des matchs dans le Round actuel qui sont prêts (2 joueurs présents) mais non démarrés.
2. **Match Launch :**
* Appel API vers *GameService* (`POST /game/create`) pour les paires prêtes.
* Récupération de l'`external_game_id`.
* Notification aux joueurs : "Votre match va commencer, redirection vers l'arène".


3. **Wait for Results :** Le système passe en attente passive (Listening).
4. **Result Processing (Sur event RabbitMQ) :**
* Réception du vainqueur.
* Mise à jour de l'arbre : Le vainqueur monte au nœud parent.
* Le perdant est éliminé (statut `ELIMINATED`).


5. **Round Transition :**
* Si tous les matchs du Round N sont finis -> Passage au Round N+1.
* Répétition de l'étape 1.



#### 2.4 Phase de Clôture

* **Condition :** Il ne reste qu'un seul joueur au sommet de l'arbre.
* **Actions :**
* Marquer le tournoi comme `COMPLETED`.
* Archiver les résultats dans l'historique utilisateur (si module User Management actif).
* Envoyer une notification "End of Tournament" avec le podium final.



### 3. Gestion des Cas Limites (Edge Cases)

Comment le workflow réagit aux imprévus ?

* **Disqualification / Forfait (Walkover) :**
* Si un joueur quitte le tournoi *pendant* qu'il est en cours (déconnexion longue).
* **Action :** L'adversaire gagne automatiquement le match en cours. Le joueur déconnecté est marqué `DISQUALIFIED`.


* **Nombre de joueurs impair :**
* Explication de la gestion des "Byes" (victoire automatique au premier tour) si on supporte des nombres de joueurs non puissances de 2 (ex: 3 joueurs). *Note : Préciser si on se limite strictement à 4/8/16 pour simplifier.*


* **Crash du Service Jeu :**
* Si le *GameService* ne répond pas lors de la tentative de création de match.
* **Retry Policy :** Tentative de relance après 5s, puis annulation du match si échec persistant.



### 4. Structure de Données de l'État (State Payload)

Détail technique de l'objet JSON manipulé tout au long du workflow.

```json
{
  "round": 1,
  "nodes": [
    { "id": 1, "p1": "UserA", "p2": "UserB", "next": 3 }, // Match Round 1
    { "id": 2, "p1": "UserC", "p2": "UserD", "next": 3 }, // Match Round 1
    { "id": 3, "p1": null,    "p2": null,    "next": null } // Finale (Round 2)
  ]
}

```

* Explication de la navigation dans l'arbre (chaque match pointe vers un match "parent" via `next`).