# Vue d'ensemble du Service de Tournoi

### 1. Introduction

* **Définition :** Le service `tournament` est l'orchestrateur des compétitions multi-joueurs. Il agit comme un "Maître du Jeu" administratif.
* **Philosophie :** Il ne gère pas la balle qui rebondit (rôle du *Game Service*), mais l'organisation structurelle : qui joue contre qui, et qui avance au tour suivant.
* **Contexte :** Ce service répond aux exigences de la partie mandataire (Tournoi 4 joueurs) et des modules majeurs (Tournois à N joueurs, Historique).

### 2. Responsabilités Principales

Liste des missions critiques du service.

* **Gestion du Cycle de Vie (Lifecycle Management) :**
* Création, Inscription (Lobby), Démarrage, Déroulement, Clôture.


* **Gestion de l'Arbre de Tournoi (Bracket System) :**
* Génération des paires (Matchups) pour le premier round.
* Progression automatique des vainqueurs vers les rounds suivants.


* **Persistance de l'État :**
* Sauvegarde critique de l'état du tournoi à chaque modification. Si le serveur redémarre, le tournoi doit reprendre exactement là où il s'était arrêté (Recovery).


* **Diffusion en Temps Réel :**
* Informer les participants et spectateurs de l'évolution de l'arbre (ex: "Joueur A a gagné, il affrontera Joueur B").



### 3. Périmètre Fonctionnel (Scope)

Délimitation stricte pour respecter l'architecture microservices.

* **Dans le périmètre (In-Scope) :**
* Support des Alias (Mode Mandatory) ET des Utilisateurs authentifiés (Mode User Management).
* Gestion des déconnexions *pendant* un tournoi (Disqualification ou Forfait).
* Historisation des résultats finaux.


* **Hors périmètre (Out-of-Scope) :**
* **Matchmaking de partie unique :** Le service ne cherche pas d'adversaires aléatoires, il exécute un arbre prédéfini.
* **Logique de Jeu :** Le service ne sait pas ce qu'est un "paddle" ou un "score de 11-0". Il ne connaît que "Gagnant/Perdant".
* **Chat :** La communication entre joueurs est gérée par le service *Chat* ou *Social*, même si le tournoi peut émettre des notifs système.



### 4. Interactions avec les autres services

Comment ce chef d'orchestre communique-t-il ?

* **Service Game :**
* Le Tournoi *commande* au Service Game de créer une partie (`POST /games` ou Event).
* Le Tournoi *écoute* le Service Game pour savoir quand une partie est finie (`Event: game.finished`).


* **Service User Management :**
* Vérification de l'existence des joueurs (si mode authentifié).
* Mise à jour des stats "Tournois gagnés" dans le profil utilisateur.


* **Frontend (SPA) :**
* Visualisation de l'arbre dynamique via WebSocket.



### 5. Stratégie "Alias vs Comptes"

Explication de la flexibilité nécessaire pour valider le projet (Mandatory vs Modules).

* **Abstraction du Participant :** Le service utilise une entité générique `Participant`.
* Dans le cas Mandatory : `Participant` = `{ id: generated_uuid, alias: "InputUser", type: "guest" }`.
* Dans le cas Module : `Participant` = `{ id: user_db_uuid, alias: "DbPseudo", type: "registered" }`.


* Cette approche permet d'utiliser le même moteur de tournoi pour les deux modes sans dupliquer le code.

### 6. Stack Technique & Infrastructure

Aperçu rapide des outils.

* **Langage :** TypeScript / Fastify.
* **Base de données :** SQLite (Crucial ici pour stocker la structure JSON complexe des arbres).
* **Communication :** REST (CRUD Tournois) + WebSocket (Lobby) + RabbitMQ (Réception des résultats de matchs).