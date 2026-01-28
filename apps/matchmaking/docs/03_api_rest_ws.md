# Interface de Communication : REST & WebSockets

### 1. Protocoles et Sécurité

Cette section définit les standards de communication rigoureux imposés pour interagir avec le service de Matchmaking. La sécurité des échanges est une priorité absolue et suit le modèle "Zero Trust".

* **Transport Sécurisé (TLS/SSL)**
    * **HTTPS (REST) :** Tous les endpoints API exposés doivent impérativement être consommés via le protocole **HTTPS**. Toute tentative de connexion via HTTP clair sera rejetée (ou redirigée via HSTS), garantissant la confidentialité des échanges API.
    * **WSS (WebSocket Secure) :** La connexion temps réel utilise exclusivement le protocole **WSS**. Cela garantit que les paquets de données (incluant les identifiants de session et événements de jeu) sont chiffrés de bout en bout, protégeant contre l'écoute réseau et les attaques de type Man-in-the-Middle (MITM).

* **Stratégie d'Authentification**
    
    Le service délègue la gestion des identités au *User Management Service* mais vérifie la validité des accès via des **JSON Web Tokens (JWT)** signés.
    * **Pour l'API REST :** Le client doit inclure le token dans le header standard HTTP de chaque requête :
      `Authorization: Bearer <votre_token_jwt>`
    * **Pour les WebSockets (Handshake) :**
      L'authentification s'effectue lors de la phase de négociation initiale (Handshake HTTP Upgrade). Deux méthodes sont supportées selon les capacités du client :
      1.  **Header (Préféré) :** Envoi du header `Authorization` (supporté par les clients non-navigateurs ou bibliothèques spécifiques).
      2.  **Query Parameter (Fallback) :** Envoi du token dans l'URL de connexion pour les clients navigateurs natifs :
          `wss://api.transcendence.com/matchmaking?token=<votre_token_jwt>`

* **Validation et Assainissement des Données**
    * **Principe de Défense en Profondeur :** Aucune donnée entrante n'est traitée avant d'avoir été strictement validée.
    * **Implémentation :** Le service utilise des **DTOs (Data Transfer Objects)** couplés à des schémas de validation robustes (bibliothèque **Zod**).
    * **Comportement :** Si un payload JSON ne correspond pas exactement au schéma attendu (champs manquants, types incorrects, format d'UUID invalide), la requête est rejetée immédiatement (**Fail Fast**) avant même d'atteindre le contrôleur ou la logique métier.



### 2. API REST (Endpoints Synchrones)

Bien que la fonctionnalité principale de matchmaking repose sur des WebSockets pour l'interactivité temps réel, le service expose une interface REST critique. Ces endpoints synchrones sont dédiés à l'observabilité du système (pour les équipes DevOps) et aux opérations de maintenance, plutôt qu'à l'expérience utilisateur directe.

* **Monitoring & System (Observabilité)**
    Ces routes sont publiques (ou protégées par un pare-feu interne) et sont consommées par les outils d'orchestration et de surveillance.

    * `GET /health`
        * **Usage :** Sonde de vivacité (Liveness Probe) utilisée par Docker ou Kubernetes.
        * **Comportement :** Le service effectue une vérification interne rapide (disponibilité de la boucle d'événements, connexion basique aux services dépendants).
        * **Réponse :** Retourne un code `200 OK` si le service est opérationnel. Tout autre code (ou timeout) signale au load balancer de retirer cette instance du trafic.

    * `GET /metrics`
        * **Usage :** Endpoint de scraping pour **Prometheus**.
        * **Format :** Texte brut (format OpenMetrics).
        * **Métriques Clés Exposées :**
            * `matchmaking_queue_size` (Gauge) : Nombre instantané de joueurs en attente.
            * `matchmaking_avg_wait_time_seconds` (Histogram) : Distribution du temps d'attente avant succès.
            * `matchmaking_matches_created_total` (Counter) : Nombre total de parties générées depuis le démarrage.

* **Administration / Debug (Interne)**
    Ces routes sont strictement protégées et réservées aux développeurs ou administrateurs pour le débogage en environnement de développement ou de pré-production.

    * `GET /api/matchmaking/queue`
        * **Sécurité :** Nécessite un rôle **Admin** (Vérification JWT stricte).
        * **Usage :** Permet de visualiser l'état actuel de la structure de données en mémoire.
        * **Réponse :** Retourne un tableau JSON représentant la file d'attente.
        * **Note de confidentialité :** Pour des raisons de sécurité et de conformité (RGPD), les données retournées doivent être **anonymisées** (ex: afficher uniquement les UUIDs et les scores ELO, sans révéler les IPs ou données personnelles).



### 3. API WebSocket (Temps Réel)

Le protocole WebSocket (WSS) constitue le canal de communication privilégié pour ce service. Contrairement au modèle requête-réponse du REST, le WebSocket maintient une connexion persistante bidirectionnelle. Ce choix architectural est motivé par deux impératifs techniques :
1.  **Réactivité :** La notification d'un match trouvé doit être instantanée pour assurer la synchronisation des deux joueurs.
2.  **Détection de présence :** La fermeture du socket (volontaire ou accidentelle) agit comme un signal immédiat de "Sortie de File", permettant de nettoyer la mémoire instantanément et d'éviter les "matchs fantômes".

#### 3.1 Événements Entrants (Client -> Serveur)

Ces événements correspondent aux commandes émises par le client frontend pour interagir avec le système de file d'attente.

* **Event : `join_queue`**
    * **Description :** L'utilisateur exprime son intention de jouer. À la réception, le serveur valide l'identité du joueur (via le token de connexion), vérifie qu'il n'est pas déjà en jeu ou en file, et l'ajoute à la structure de données en mémoire pour une partie standard.
    * **Payload :** Vide (ou `{}`), le mode Classique étant l'unique mode disponible par défaut.

* **Event : `leave_queue`**
    * **Description :** L'utilisateur annule sa recherche de partie. Le serveur retire immédiatement l'utilisateur de la file d'attente. Cette action est idempotente (aucune erreur n'est levée si l'utilisateur n'était pas dans la file).
    * **Payload :** Aucun (Vide).

#### 3.2 Événements Sortants (Serveur -> Client)

Ces messages sont poussés asynchrone par le serveur pour notifier le client des changements d'état.

* **Event : `queue_joined`**
    * **Description :** Acquittement (ACK) envoyé immédiatement après une commande `join_queue` réussie. Cela permet au client de passer l'interface en mode "Recherche en cours...".
    * **Payload :**
    ```json
    {
      "timestamp": 1678900000,
      "message": "Successfully joined the matchmaking queue."
    }
    ```

* **Event : `match_found`**
    * **Description :** L'événement critique signalant le succès du matchmaking. Le serveur a constitué un binôme et a reçu une confirmation de création de session du *Game Service*.
    * **Action Client :** Le frontend doit utiliser ces informations pour rediriger immédiatement l'utilisateur vers la vue du jeu et établir une nouvelle connexion WebSocket avec le serveur de jeu.
    * **Payload (DTO) :**
    ```json
    {
      "gameId": "550e8400-e29b-41d4-a716-446655440000", // UUID de la session
      "opponentAlias": "DarkVador",                     // Pour affichage UI ("VS DarkVador")
      "serverUrl": "wss://[game-service.transcendence.com/play](https://game-service.transcendence.com/play)" // URL de redirection
    }
    ```

* **Event : `error`**
    * **Description :** Notifie le client qu'une opération a échoué. Le frontend devrait afficher un message d'erreur approprié (Toast/Alert) sans interrompre la connexion si possible.
    * **Payload :**
    ```json
    {
      "code": "ALREADY_QUEUED", // Code d'erreur machine (pour i18n)
      "message": "User is already in the queue." // Message lisible (fallback)
    }
    ```



### 4. Gestion des Déconnexions

La nature volatile des connexions Web (réseaux mobiles instables, fermeture d'onglets, mise en veille) impose une gestion rigoureuse de la présence des utilisateurs. Le service adopte une politique de **tolérance zéro** pour les connexions inactives afin de garantir l'intégrité des matchs générés.

* **Mécanisme de Heartbeat (Ping/Pong)**
    * **Objectif :** Détecter les "connexions zombies" (cas où le lien réseau est rompu mais le socket TCP n'a pas encore timeout) et maintenir les sessions actives à travers les proxies/load balancers.
    * **Implémentation :**
        * Le serveur envoie périodiquement une trame `PING` (intervalle configurable, ex: 30s) à tous les clients connectés.
        * Le client (navigateur) doit répondre automatiquement par une trame `PONG`.
        * **Sanction :** Si un client ne répond pas au bout d'un délai défini (ex: `PING_TIMEOUT`), le serveur considère la connexion comme perdue et force la fermeture du socket côté serveur.

* **Gestion de la Déconnexion (OnDisconnect)**
    * **Déclencheur :** Cet événement survient dès que le socket est fermé, que ce soit volontairement (l'utilisateur ferme l'onglet), accidentellement (perte de réseau détectée) ou suite à un échec du Heartbeat.
    * **Action Immédiate :** Le `MatchmakingGateway` intercepte l'événement `handleDisconnect`.
    * **Logique de Nettoyage :**
        1.  Le système identifie si le socket déconnecté est associé à un joueur présent dans la file d'attente active.
        2.  Si c'est le cas, le joueur est **instantanément retiré** de la mémoire.
    * **Justification :** Cette suppression préemptive est cruciale pour éviter les **"matchs fantômes"**. Si cette étape n'était pas respectée, l'algorithme risquerait d'apparier un joueur actif avec un joueur déconnecté, créant une partie impossible à démarrer et frustrant l'utilisateur restant.



### 5. Codes d'Erreur et Réponses Standards

Afin de faciliter le débogage et l'automatisation de la gestion des erreurs côté client (Frontend), le service adopte une convention stricte pour les retours d'état. Cette standardisation s'applique distinctement aux échanges REST et aux flux WebSocket.

#### 5.1 Codes de Statut HTTP (API REST)
Ces codes concernent exclusivement les endpoints synchrones (Monitoring, Admin).

* **`200 OK`**
    * **Signification :** La requête a été traitée avec succès.
    * **Contexte :** Réponse standard pour les health checks ou la récupération de métriques.

* **`401 Unauthorized`**
    * **Signification :** Échec d'authentification.
    * **Contexte :** Le header `Authorization` est manquant, le Token JWT est expiré ou la signature cryptographique est invalide.

* **`429 Too Many Requests`**
    * **Signification :** Limite de fréquence atteinte (Rate Limiting).
    * **Contexte :** Protection contre les abus (ex: spam du bouton "Refresh" sur les stats). Le client doit attendre avant de réessayer.

#### 5.2 Protocole WebSocket
La gestion des erreurs WebSocket se divise en deux catégories : les fermetures de connexion (fatales) et les notifications d'erreur (informatives).

**A. Codes de Fermeture (Close Frames)**
Ces codes sont envoyés lorsque le serveur décide de terminer brutalement la connexion TCP.

* **`1000 (Normal Closure)`**
    * **Signification :** Déconnexion propre.
    * **Contexte :** Le client a demandé à se déconnecter ou le serveur redémarre proprement.

* **`1008 (Policy Violation)`**
    * **Signification :** Violation des règles de sécurité ou du protocole.
    * **Contexte :** Le token JWT fourni lors du Handshake est invalide, ou le client tente d'envoyer des données binaires non supportées.

**B. Erreurs Applicatives (Payloads JSON)**
Ces erreurs ne ferment pas la connexion mais informent l'utilisateur qu'une action spécifique a échoué. Elles sont envoyées via l'événement `error`.

* **Format du Payload :**
```json
{
  "code": "ERROR_CODE_STRING", // Code machine stable pour l'i18n
  "message": "Description lisible de l'erreur en anglais."
}

```

* **Codes Standards :**
* `ALREADY_QUEUED` : Le joueur tente de rejoindre la file alors qu'il y est déjà.
* `INVALID_PAYLOAD` : Les données envoyées ne respectent pas le schéma Zod attendu.
* `INTERNAL_ERROR` : Une erreur inattendue est survenue côté serveur (bug générique).