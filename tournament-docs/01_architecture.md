# Architecture Technique : Orchestration et Gestion d'État

### 1. Principes d'Architecture

* **Pattern :** Architecture en couches (N-Tier) avec Injection de Dépendances via `my-fastify-decorators`.
* **Concept Central : Machine à États (State Machine).**
* Le service n'est pas seulement réactif ; il possède une logique interne qui fait avancer l'état d'un tournoi (ex: `PENDING` -> `ROUND_1` -> `ROUND_2` -> `FINISHED`).


* **Découplage :** Séparation stricte entre la *Logique de Tournoi* (qui joue contre qui) et l'*Exécution du Jeu* (qui gagne le point).

### 2. Organisation Modulaire

Découpage du code source pour isoler les responsabilités.

* **AppModule :** Configuration globale et bootstrap.
* **TournamentModule :**
* Gestion du cycle de vie global (CRUD, Start, Cancel).
* Gestion du Lobby (WebSocket).


* **BracketModule (Moteur d'Arbre) :**
* Module "Mathématique" pur.
* Contient la logique de génération des arbres (Brackets), le mélange des joueurs (Shuffle), et la détermination du prochain match.
* Ne dépend pas de la base de données (Pure Functions idéalement).


* **HistoryModule :**
* Gestion de l'archivage et de la consultation des tournois terminés.


* **InfrastructureModule :**
* Connexion SQLite, Client HTTP vers GameService, et Consommateur RabbitMQ.



### 3. Composants Clés et Rôles

* **TournamentController (`@Controller`) :**
* Endpoints REST pour créer/rejoindre un tournoi.
* Validation des inputs (taille du tournoi, alias des joueurs).


* **TournamentGateway (`@WebSocketGateway`) :**
* Gère la "Room" du tournoi.
* Diffusion de l'état de l'arbre en temps réel (ex: mise à jour visuelle du bracket sur le front).


* **TournamentService (`@Service`) :**
* Chef d'orchestre. Il appelle le `BracketService` pour calculer la suite, puis sauvegarde dans le `Repository`.
* Gère les transitions d'état.


* **BracketEngine (Service Utilitaire) :**
* Méthodes : `generateBracket(players)`, `advanceWinner(tree, matchId, winner)`, `isRoundComplete(tree)`.


* **TournamentRepository :**
* Abstraction sur SQLite.
* Gère les transactions pour s'assurer qu'on ne corrompt pas l'état du tournoi si deux résultats arrivent en même temps.



### 4. Le Workflow de Traitement (The Processing Loop)

Comment le service réagit-il aux événements externes ?

1. **Réception d'un événement `game.finished` (via RabbitMQ).**
2. **Chargement du contexte :** Le service récupère l'état complet du tournoi associé depuis SQLite.
3. **Application de la logique :**
* Enregistrement du vainqueur.
* Vérification : "Est-ce que tous les matchs du Round actuel sont finis ?"


4. **Transition (Si Round terminé) :**
* Génération des matchs du Round suivant.
* Appel API vers *GameService* pour pré-réserver les nouvelles parties (ou attente que les joueurs cliquent "Prêt").


5. **Persistance :** Sauvegarde atomique du nouvel arbre JSON.
6. **Broadcast :** Notification via WS à tous les clients : "Le bracket a changé".

### 5. Modèle de Données et Sérialisation

* **Stockage JSON :**
* Explication du choix de stocker la structure de l'arbre (le graphe des matchs) sous forme de JSON textuel dans une colonne SQLite, plutôt que de créer une table SQL par match.
* Avantage : Reconstruction facile de l'objet en mémoire JavaScript.


* **DTOs (Data Transfer Objects) :**
* Structure standardisée envoyée au Frontend pour dessiner le graphique du tournoi.



### 6. Gestion des Pannes et Reprise (Recovery)

Ce point est crucial pour l'architecture stateful.

* **Démarrage du Serveur :**
* Au boot, le service scanne la DB pour trouver les tournois `IN_PROGRESS`.
* Il vérifie l'état des matchs en cours auprès du *Game Service* (Reconciliation) pour voir si des résultats ont été manqués pendant la coupure.
* Il rétablit les connexions RabbitMQ nécessaires.