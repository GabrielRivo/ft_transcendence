# Intégration Événementielle et RabbitMQ

### 1. Stratégie de Découplage

* **Philosophie :** Le Service Tournoi ne doit pas savoir *comment* une partie se joue, il doit seulement savoir *quand* elle se termine et *qui* a gagné.
* **Pattern :** Utilisation de **RabbitMQ** en mode Pub/Sub.
* Le service agit principalement comme **Consommateur** (Subscriber) pour les résultats de matchs.
* Il agit comme **Producteur** (Publisher) pour les statistiques de fin de tournoi.



### 2. Configuration de l'Infrastructure

* **Connexion :** Injection de l'URI RabbitMQ via **Vault** au démarrage du module.
* **Échange (Exchange) :**
* Utilisation d'un `Topic Exchange` global (ex: `pong.events`) pour écouter les événements venant de plusieurs sources.


* **File (Queue) :**
* Nom : `tournament_service_queue`.
* Durabilité : `true` (Pour ne pas perdre les résultats de match si le service redémarre).



### 3. Événements Souscrits (Incoming - Ce qu'on écoute)

C'est ici que la magie de l'avancement automatique de l'arbre opère.

#### 3.1 Résultat de Partie (`game.finished`)

* **Source :** *Game Service*.
* **Routing Key :** `game.finished`.
* **Pourquoi :** C'est le déclencheur principal pour faire passer un tournoi de l'état "Round 1 en cours" à "Round 1 terminé" ou "Round 2 prêt".
* **Payload Attendu :**
```json
{
  "gameId": "uuid-game-123",
  "tournamentId": "uuid-tour-999", // Important pour filtrer !
  "winnerId": "user-A",
  "loserId": "user-B",
  "score": "11-4",
  "reason": "score_limit" | "disconnect" | "forfeit"
}

```


* **Logique de Traitement (Handler) :**
1. Vérifier si `tournamentId` est présent (sinon ignorer, c'est une partie hors tournoi).
2. Charger l'arbre du tournoi depuis SQLite.
3. Identifier le nœud correspondant au `gameId`.
4. Mettre à jour le vainqueur et déclencher la transition vers le match suivant (cf. *Workflows*).
5. `ACK` le message RabbitMQ.



#### 3.2 Mise à jour Utilisateur (`user.updated`)

* **Source :** *User Management Service*.
* **Routing Key :** `user.profile.updated`.
* **Pourquoi :** Si un joueur change d'avatar ou de pseudo pendant un tournoi, l'arbre visuel doit être mis à jour.
* **Action :** Mettre à jour le cache local des participants dans la table `TournamentParticipants`.

### 4. Événements Publiés (Outgoing - Ce qu'on émet)

#### 4.1 Fin de Tournoi (`tournament.ended`)

* **Destinataire :** *User Management Service* (pour l'historique/stats), *Achievement Service*.
* **Routing Key :** `tournament.ended`.
* **Payload :**
```json
{
  "tournamentId": "uuid",
  "winnerId": "user-A",
  "rankings": [
    { "userId": "user-A", "rank": 1 },
    { "userId": "user-B", "rank": 2 },
    { "userId": "user-C", "rank": 3 } // Demi-finaliste
  ],
  "startedAt": "timestamp",
  "endedAt": "timestamp"
}

```



#### 4.2 Audit Log (`tournament.created`, `tournament.cancelled`)

* **Destinataire :** *Log/Monitoring Service* (ELK).
* **Utilité :** Traçabilité administrative.

### 5. Idempotence et Robustesse

Comment gérer les problèmes de réseau ou de duplication de messages.

* **Problème de la double livraison :** Si RabbitMQ envoie deux fois le message `game.finished` pour la même partie.
* **Solution :** Vérifier dans la DB si le match a déjà un vainqueur. Si oui, ignorer le second message (Idempotency).


* **Gestion des erreurs (NACK) :**
* Si la base de données est verrouillée ou inaccessible lors de la réception d'un résultat :
* Renvoyer un `NACK` (Negative Acknowledgement) avec `requeue=true` pour réessayer plus tard.


* **Dead Letter Queue (DLQ) :**
* Si le payload est invalide (JSON corrompu), envoyer vers une DLQ pour analyse manuelle sans bloquer la file principale.



### 6. Diagramme de Séquence Asynchrone

Un schéma montrant :

1. GameService publie `game.finished`.
2. RabbitMQ route vers `tournament_service_queue`.
3. TournamentService consomme, traite, et ACK.