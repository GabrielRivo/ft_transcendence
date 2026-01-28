# Architecture Événementielle et RabbitMQ

### 1. Stratégie de Communication Asynchrone

Au-delà des interactions synchrones directes (REST/WebSocket), le service s'intègre dans l'écosystème global via une architecture orientée événements (**Event-Driven Architecture**). Cette approche utilise **RabbitMQ** comme colonne vertébrale pour garantir le découplage, la résilience et la scalabilité des échanges inter-services.

* **Rôle du Message Broker (RabbitMQ)**
    * **Objectif :** Découpler temporellement les services. Le Matchmaking ne doit pas être bloqué par la disponibilité ou la latence des services périphériques (ex: Notification, Statistiques).
    * **Fonctionnement :** RabbitMQ agit comme intermédiaire de confiance. Si un service consommateur est hors ligne ou surchargé, le broker retient les messages et les délivrera dès que possible, assurant qu'aucune donnée métier ne soit perdue.

* **Le Modèle Pub/Sub (Publish/Subscribe)**
    * **Philosophie "Faits" vs "Ordres" :**
        Contrairement à une approche impérative où le service enverrait des commandes directes (ex: "Envoie un email maintenant"), nous adoptons une approche réactive basée sur les **Faits**.
        * **Producteur :** Le service de Matchmaking publie des événements passés, irrévocables (ex: `matchmaking.match_created`). Il n'a pas besoin de savoir *qui* écoute ce message ni *ce que* les autres services en feront.
        * **Consommateurs :** D'autres services (History, Stats, Achievements) s'abonnent à ce flux pour déclencher leur propre logique (archiver le match, incrémenter le compteur de parties jouées, etc.).
    * **Avantage :** Cela permet d'ajouter de nouvelles fonctionnalités au projet (ex: un service d'Analytics) sans jamais avoir à modifier une seule ligne de code dans le service de Matchmaking.

* **Abstraction via Librairie Partagée (Shared Package)**
    * **Stratégie :** Plutôt que de dupliquer le code de connexion AMQP dans chaque service, la complexité est encapsulée dans un package npm interne dédié (ex: `@transcendence/message-broker`).
    * **Rôle du Package :**
        * Il gère la "tuyauterie" technique : initialisation de la connexion, gestion des canaux (channels), stratégie de reconnexion automatique (Retry Policy) et définition de la topologie (Exchanges/Queues).
        * Il expose une API simplifiée et agnostique pour les services consommateurs.
    * **Intégration :** Le service de Matchmaking importe ce package et l'utilise comme une "boîte noire". Il appelle simplement des méthodes de haut niveau (ex: `broker.publish()` ou `broker.subscribe()`) sans se soucier des détails protocolaires sous-jacents, assurant une uniformité parfaite des échanges au sein du projet.



### 2. Configuration de la Connexion

L'initialisation de la couche de transport asynchrone repose sur une configuration stricte, assurant à la fois la performance des échanges et la sécurité des accès au bus de messages.

* **Infrastructure et Protocole**
    * **Environnement :** Le service s'interface avec une instance **RabbitMQ** hébergée dans un conteneur Docker dédié au sein de la stack d'infrastructure.
    * **Protocole :** La communication s'effectue via le standard **AMQP 0-9-1**. Le package partagé gère l'établissement d'une connexion persistante TCP et surveille son état (reconnexion automatique avec *Exponential Backoff* en cas de redémarrage du broker).

* **Topologie des Échanges (Exchanges)**
    * **Stratégie de Routage :** Le service utilise principalement un **Topic Exchange** (ex: `transcendence.topic` ou `pong.topic`). Ce type d'échange offre la flexibilité nécessaire pour router les messages en fonction de motifs (patterns) plutôt que de noms de files rigides.
    * **Usage :**
        * **Publication :** Le service publie ses événements avec des clés de routage hiérarchiques (ex: `matchmaking.player.queued`, `matchmaking.session.created`).
        * **Consommation :** Si le service doit écouter des événements externes (ex: mise à jour de règles par un admin), il lie ses files temporaires à cet échange via des jokers (wildcards) spécifiques.

* **Gestion Sécurisée des Secrets**
    * **Injection Dynamique :** Aucune information de connexion sensible n'est présente dans le code source ou les fichiers de configuration statiques.
    * **Flux Vault :** Lors de la séquence de démarrage (Bootstrap), le service interroge **HashiCorp Vault** pour récupérer les crédentials éphémères.
    * **URI de Connexion :** L'URI complète (format `amqps://user:password@host:5672/vhost`) est construite dynamiquement en mémoire et passée au constructeur du client RabbitMQ, garantissant que les mots de passe ne sont jamais exposés en clair sur le disque.



### 3. Événements Publiés (Outgoing Events)

Dans notre architecture distribuée, le service de Matchmaking ne se contente pas de répondre aux requêtes ; il diffuse également de l'information sur son activité interne ("Fire and Forget"). Ces événements permettent aux autres composants (Dashboard Admin, Monitoring, Analytics) de suivre la santé du système en temps réel sans polluer les API REST.

* **Event : `matchmaking.status.update`**
    * **Type :** Télémétrie / Monitoring Métier.
    * **Routing Key :** `matchmaking.status`
    * **Déclencheur (Trigger) :**
        * **Périodique :** Émis à intervalle régulier (ex: toutes les 5 secondes) pour fournir un "battement de cœur" du service.
        * **Seuil critique :** Peut également être déclenché immédiatement si la file d'attente dépasse une taille critique (ex: > 100 joueurs), permettant une alerte rapide.
    * **Utilité :** Cet événement est consommé par le Dashboard Administrateur pour afficher des graphiques en temps réel. L'approche Pub/Sub est ici bien plus performante que le "Polling" (interrogation répétée) d'une API REST par le client admin.
    * **Exemple de Payload :**
    ```json
    {
      "timestamp": "2023-11-20T14:30:00Z",
      "nodeId": "matchmaking-service-01", // Utile si plusieurs instances
      "metrics": {
        "queueLength": 42,            // Nombre de joueurs en attente
        "averageWaitTimeMs": 1200,    // Temps d'attente moyen (fenêtre glissante)
        "activeMatchesLastMinute": 5  // Débit de création de parties
      }
    }
    ```

* **Note sur la Création de Partie (`matchmaking.match.created`)**
    * **Architecture Choisie :** Conformément aux décisions actées dans la section *Interactions*, la création effective de la partie est une opération **synchrone** via REST (`POST /games`).
    * **Pourquoi pas un événement ?** L'utilisation d'un événement asynchrone ici rendrait difficile la redirection immédiate des joueurs. Le service Matchmaking a besoin de récupérer le `gameId` *tout de suite* pour le transmettre aux clients WebSocket.
    * **Alternative :** Bien que l'ordre de création soit REST, le service *pourrait* émettre un événement `matchmaking.match.formed` purement informatif a posteriori, destiné uniquement aux services d'historique ou de statistiques (Analytics), sans impacter le flux de jeu critique.



### 4. Événements Souscrits (Incoming Events)

Le service de Matchmaking ne se contente pas d'émettre des messages ; il agit également comme un consommateur actif pour maintenir la cohérence de ses données locales. Ces souscriptions sont essentielles pour garantir que les décisions de matchmaking sont basées sur des données fraîches sans multiplier les appels HTTP coûteux vers les autres services.

* **Event : `game.finished`**
    * **Source :** *Game Service* (ou *Tournament Service*).
    * **Routing Key :** `game.finished` (Topic Exchange).
    * **Objectif Critique :** Synchronisation des compétences (ELO).
    * **Contexte :** Lorsqu'un match se termine, les scores ELO des participants sont recalculés. Si un joueur décide de relancer une recherche immédiatement (Re-queue), le matchmaking doit impérativement utiliser son **nouveau score**.
    * **Action :**
        * Le service intercepte ce message contenant les nouveaux scores.
        * Il met à jour son cache local (si un mécanisme de cache Redis/Map est utilisé pour limiter les appels au *User Service*) ou invalide l'entrée correspondante.
        * Cela garantit une précision absolue de l'algorithme sans spammer le *User Service* de requêtes `GET /users/:id` à chaque entrée en file.
    * **Payload Attendu :**
    ```json
    {
      "gameId": "a1b2c3d4-...",
      "timestamp": 1678900000,
      "players": [
        { "userId": "user-uuid-1", "newElo": 1250, "outcome": "win" },
        { "userId": "user-uuid-2", "newElo": 1100, "outcome": "loss" }
      ]
    }
    ```

* **Event : `user.updated`**
    * **Source :** *User Service*.
    * **Routing Key :** `user.profile.updated`.
    * **Objectif :** Cohérence de l'interface utilisateur (UI Consistency).
    * **Contexte :** Un scénario rare mais possible survient lorsqu'un utilisateur modifie son profil (changement de pseudo ou d'avatar) dans un onglet du navigateur alors qu'il est déjà présent dans la file d'attente dans un autre onglet.
    * **Action :**
        * Le service vérifie si le `userId` concerné est présent dans la file d'attente active (In-Memory).
        * Si oui, l'objet `QueuedPlayer` est mis à jour à la volée avec les nouvelles métadonnées.
        * **Bénéfice :** Lorsque le match sera trouvé quelques secondes plus tard, l'événement `match_found` renverra le pseudo correct et à jour, évitant une dissonance cognitive pour l'utilisateur.
    * **Payload Attendu :**
    ```json
    {
      "userId": "user-uuid-1",
      "changes": {
        "alias": "NewNickName",
        "avatarUrl": "/uploads/new-avatar.png"
      }
    }
    ```



### 5. Files d'Attente et Routing Keys

Cette section spécifie la topologie exacte implémentée dans RabbitMQ pour garantir que le service de Matchmaking ne reçoive que les messages qui le concernent, tout en assurant la persistance des données en cas de panne.

* **Configuration de la File (Queue Definition)**
    * **Nom de la Queue :** `matchmaking_queue`
    * **Type :** Classique.
    * **Durabilité (Durable) :** `true`.
        * **Justification :** La file est déclarée comme "Durable" pour survivre à un redémarrage éventuel du serveur RabbitMQ. Bien que les données de matchmaking soient volatiles, les événements de mise à jour de profil ou de fin de partie ne doivent pas être perdus si le broker redémarre.

* **Liaisons et Routage (Bindings)**
    Le service lie sa file unique à l'échange principal (`transcendence.topic`) via les clés de routage suivantes. Cela agit comme un filtre sélectif :

    * `game.finished`
        * **Source :** Game Service.
        * **Usage :** Déclenche la mise à jour du cache ELO local.
    * `user.profile.updated`
        * **Source :** User Service.
        * **Usage :** Déclenche la mise à jour des métadonnées (Avatar/Pseudo) des joueurs en attente.

* **Stratégie d'Acquittement (Acknowledgement)**
    * **Choix Technique :** **Manual Acknowledgement (Ack manuel)**.
    * **Justification :** L'option `auto-ack` (acquittement automatique dès réception) est désactivée.
    * **Fonctionnement :**
        1. Le service reçoit le message.
        2. Il tente de traiter la logique métier (ex: mettre à jour le cache).
        3. Ce n'est qu'en cas de succès qu'il envoie le signal `ack` à RabbitMQ pour supprimer le message de la file.
    * **Sécurité :** Si le traitement échoue (exception non gérée, crash du service), le message n'est pas acquitté. RabbitMQ le replacera alors automatiquement dans la file pour qu'une autre instance du service puisse le traiter, garantissant qu'aucun événement `game.finished` ne soit perdu dans la nature.



### 6. Gestion des Erreurs et Robustesse

Dans une architecture distribuée, la fiabilité des échanges asynchrones est primordiale. Le service implémente des mécanismes de défense avancés pour gérer les défaillances du broker ou les messages corrompus sans impacter la stabilité globale de l'application.

* **Dead Letter Queue (DLQ) : Le Filet de Sécurité**
    * **Problème :** Il arrive qu'un message soit malformé ou contienne des données qui provoquent un bug inattendu lors de sa consommation (ce qu'on appelle un *"Poison Message"*). Si le service rejette ce message et qu'il est replacé automatiquement dans la file (Nack + Requeue), il risque de provoquer une boucle infinie de crashs.
    * **Solution :** Une file de "lettres mortes" (`matchmaking_queue.dlq`) est configurée parallèlement à la file principale.
    * **Configuration :** La file principale est paramétrée avec l'argument `x-dead-letter-exchange`.
    * **Fonctionnement :**
        1. Si un message est rejeté explicitement par le consommateur (ex: erreur de validation JSON irrécupérable) ou s'il dépasse le nombre maximal de tentatives de livraison (Retry Count), il n'est pas supprimé.
        2. RabbitMQ le déplace automatiquement vers la DLQ.
        3. Cela permet aux développeurs d'inspecter ultérieurement ces messages échoués pour diagnostiquer les bugs, sans bloquer le traitement des autres messages valides.

* **Stratégie de Reconnexion Automatique**
    * **Contexte :** Les microcoupures réseau ou le redémarrage du conteneur RabbitMQ ne doivent pas entraîner l'arrêt du service de Matchmaking.
    * **Mécanisme :** Le client AMQP (intégré dans le package partagé) dispose d'une logique de reconnexion robuste.
    * **Algorithme (Exponential Backoff) :**
        * En cas de perte de connexion, le service tente de se reconnecter immédiatement.
        * En cas d'échec, il attend 1 seconde, puis 2s, 4s, 8s, jusqu'à un plafond (ex: 30s).
        * Cette approche évite de surcharger le broker (effet *Thundering Herd*) lorsqu'il redémarre, tout en garantissant que le service redevienne opérationnel de manière autonome dès que l'infrastructure est rétablie.