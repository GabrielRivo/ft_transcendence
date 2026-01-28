# Vue d'ensemble du Service Matchmaking

### 1. Introduction

#### Définition

Le service de Matchmaking est un microservice autonome chargé d'orchestrer la mise en relation des joueurs en temps réel au sein de la plateforme `ft_transcendence`. Il agit comme le point d'entrée unique pour tout utilisateur souhaitant initier une session de jeu. Sa fonction primaire est de gérer une file d'attente volatile (queue), d'analyser les demandes entrantes via WebSocket, et d'identifier des paires d'adversaires compatibles pour instancier de nouvelles parties. Il garantit une transition fluide entre l'intention de jouer et le démarrage effectif de la partie, en minimisant le temps d'attente tout en assurant l'équité des rencontres.

#### Contexte

Ce service a été conçu pour répondre aux exigences fonctionnelles strictes du sujet, notamment l'obligation pour les utilisateurs de pouvoir participer à une partie de Pong en direct contre un autre joueur et la nécessité explicite d'un système de mise en relation (matchmaking).

Architecturalement, ce composant s'inscrit dans la mise en œuvre du module majeur **"Designing the Backend as Microservices"**. Cette approche permet d'isoler la logique de recherche d'adversaire de la logique de simulation physique du jeu (gérée par le *Game Service*) et de la persistance des données utilisateurs (gérée par le *User Service*). Cette séparation des responsabilités assure que le système de matchmaking reste léger, résilient et maintenable, sans créer de couplage fort avec les autres briques de l'application.



### 2. Objectifs et Responsabilités

Le service de Matchmaking a pour mission de fluidifier l'expérience utilisateur en transformant une intention de jeu individuelle en une session multijoueur concrète. Ses responsabilités s'articulent autour de trois axes fonctionnels critiques :

* **Gestion de la File d'Attente (Queue Management)**
* **Centralisation des demandes :** Le service agit comme le point d'entrée unique pour les joueurs souhaitant rejoindre une partie ("Looking for Group"). Il maintient une liste active des utilisateurs en attente via des connexions persistantes (WebSockets), assurant une prise en compte immédiate de chaque nouvelle requête.
* **Gestion du cycle de vie de l'attente :** Il doit gérer dynamiquement les entrées et sorties de la file. Cela implique la détection instantanée des déconnexions involontaires (perte de réseau, fermeture d'onglet) ou des annulations manuelles par l'utilisateur, afin de retirer immédiatement ces derniers de la liste et d'éviter la création de "matchs fantômes" (parties créées avec un joueur absent).


* **Logique d'Appariement (Pairing Logic)**
* **Équilibre compétitif :** L'algorithme doit former des paires de joueurs de niveau cohérent pour garantir l'intérêt du jeu. Cette comparaison se base sur les métriques de performance disponibles (Score ELO ou ratio Victoires/Défaites) récupérées auprès du service de gestion des utilisateurs.
* **Optimisation du temps d'attente (Bucket Expansion) :** Pour éviter des temps d'attente excessifs, le service implémente une stratégie d'élargissement progressif des critères. Si aucun adversaire de niveau strictement identique n'est trouvé après un délai défini, l'algorithme élargit la plage de score acceptable, privilégiant ainsi la rapidité de la mise en relation sur la précision absolue du niveau.


* **Création de Session et Handover**
* **Orchestration inter-services :** Une fois une paire valide identifiée, le service de Matchmaking ne gère pas la partie lui-même. Il délègue cette responsabilité en sollicitant le **Game Service** via une **requête API REST synchrone** (interne) pour instancier une nouvelle salle de jeu dédiée.
* **Notification et Redirection :** Cette approche synchrone permet d'obtenir immédiatement l'identifiant de session unique. Le service notifie alors simultanément les deux clients connectés via WebSocket du succès de l'opération et leur transmet les informations de connexion (ID de partie, URL du serveur de jeu) nécessaires pour rejoindre l'arène, finalisant ainsi son rôle dans le processus.



### 3. Périmètre Fonctionnel (Scope)

Afin de garantir une architecture robuste et maintenable, les limites du service de Matchmaking sont strictement définies selon le principe de responsabilité unique (SRP). Ce service se concentre exclusivement sur la mise en relation et délègue toutes les autres logiques aux services appropriés.

#### Dans le périmètre (In-Scope)

Les fonctionnalités suivantes relèvent de la responsabilité directe de ce service :

* **Gestion des Files d'Attente (Standard & Ranked) :**
* Prise en charge du mode de jeu principal "1v1 Classique" (Pong).
* Gestion de files d'attente distinctes si plusieurs modes de jeu sont implémentés (ex: mode avec power-ups), en appliquant la même logique algorithmique de tri.


* **Surveillance de la Disponibilité en Temps Réel :**
* Maintien d'une connexion WebSocket active avec les joueurs en attente.
* Implémentation d'un mécanisme de "Heartbeat" (Ping/Pong) pour détecter et expulser immédiatement de la file tout joueur dont la connexion serait interrompue, garantissant ainsi que seuls les utilisateurs actifs sont considérés pour un match.



#### Hors périmètre (Out-of-Scope)

Les éléments suivants sont explicitement exclus du périmètre de ce service :

* **Gestion des Tournois :**
* Le Matchmaking ne gère pas les arbres de compétition ni les rencontres planifiées. Cette logique est entièrement encapsulée dans le **Service Tournament**, qui détermine de manière déterministe qui doit affronter qui selon l'avancement d'un bracket. Le service Matchmaking traite uniquement les joueurs "libres" cherchant un adversaire inconnu.


* **Hébergement et Physique du Jeu :**
* Le service ne contient aucune logique liée au déroulement de la partie (calcul des trajectoires de balle, gestion des collisions, arbitrage des scores). Dès que la paire est formée, la responsabilité est transférée au **Service Game**.


* **Persistance des Données Utilisateurs :**
* Le service ne stocke pas les profils joueurs ni l'historique de leur score ELO sur le long terme. Il consulte ces données (fournies par le **Service User Management**) uniquement le temps nécessaire au calcul de l'appariement. Le service de Matchmaking n'est pas la "source de vérité" des données utilisateurs.



### 4. Interactions avec les autres services

Le service de Matchmaking ne fonctionne pas en vase clos ; il agit comme un pivot central dans l'architecture microservices. Ses interactions sont conçues pour être efficaces et minimiser le couplage.

* **Service User Management (Consultation)**
* **Flux :** Lecture seule (Read-Only).
* **Description :** Lorsqu'un joueur initie une recherche, le service interroge le gestionnaire d'utilisateurs pour récupérer les métadonnées essentielles au tri : l'identifiant unique (UUID) et surtout le **rang actuel (Score ELO)**. Ces données permettent de placer le joueur dans le bon segment de la file d'attente.


* **Service Game (Délégation)**
* **Flux :** Requête Synchrone (REST).
* **Description :** C'est l'interaction la plus critique. Une fois le binôme constitué, le service envoie une requête `POST /games` au Service Game. Cette requête contient uniquement les identifiants des deux joueurs (UUIDs). Le Service Game instancie alors une partie avec les règles standards et retourne en réponse l'identifiant de la session (`gameId`), indispensable pour rediriger les joueurs.


* **Service Tournament (Isolation)**
* **Flux :** Aucun (Découplage strict).
* **Description :** Conformément à l'architecture choisie, il n'y a **pas d'interaction directe** entre le Matchmaking et le Tournoi. Le Service Tournament possède sa propre logique interne pour déterminer les rencontres et contacte directement le Service Game pour lancer ses matchs. Le Service Matchmaking est exclusivement réservé aux parties "Ranked" ou "Amicales" initiées par des joueurs libres.


* **Frontend SPA (Interface Temps Réel)**
* **Flux :** Bidirectionnel (WebSocket Secure - WSS).
* **Description :** Le client web maintient une connexion persistante avec ce service durant toute la phase de recherche.
* **Client vers Serveur :** Envoi des commandes `JoinQueue`, `LeaveQueue` et des signaux de vie (Heartbeats).
* **Serveur vers Client :** Notification des changements d'état (`QueueJoined`) et, in fine, envoi de l'événement `MatchFound` contenant l'URL de redirection vers le jeu.



### 5. Contraintes Techniques et Normes

Le développement et le déploiement de ce service sont régis par un ensemble strict de règles techniques, découlant à la fois du tronc commun obligatoire et des modules majeurs sélectionnés.

* **Langage & Framework**
* Le service est développé en **TypeScript**, assurant un typage statique robuste et une meilleure maintenabilité du code.
* L'environnement d'exécution est **Node.js**, utilisant **Fastify** comme framework web. Ce choix est imposé par le module "Use a framework to build the backend"  et offre des performances optimales pour la gestion des connexions WebSocket massives.




* **Base de Données**
* Conformément aux contraintes du module "Use a database for the backend", la seule technologie de base de données autorisée est **SQLite**.


* Bien que la file d'attente active soit gérée en mémoire (In-Memory) pour des raisons de performance, SQLite est utilisé pour la persistance des journaux d'audit (historique des matchmakings) et des configurations persistantes, garantissant la cohérence des données au sein de l'infrastructure.


* **Architecture**
* Le service adopte une architecture **Microservices**. Il fonctionne comme une unité autonome, isolée des autres services (User, Game, Tournament). Il possède sa propre responsabilité métier et ne communique avec le reste du système que via des interfaces API définies, interdisant tout couplage fort ou partage de base de données direct.




* **Sécurité des Transports**
* La sécurité des échanges est non négociable. L'ensemble des communications temps réel doit impérativement transiter par le protocole **WSS (WebSocket Secure)**. De même, tous les endpoints REST exposés doivent être sécurisés via **HTTPS**, conformément aux exigences de sécurité globales du projet.



### 6. Stratégie d'Infrastructure (Aperçu)

L'intégration du service de Matchmaking au sein de l'infrastructure globale repose sur une adhésion stricte aux pratiques DevOps modernes. Le service est conçu pour être "Cloud-Native", déléguant la gestion de la configuration sensible et de l'observabilité à des composants d'infrastructure dédiés.

* **Gestion des Secrets (HashiCorp Vault)**
* Afin de garantir une sécurité maximale et d'éviter la présence de données sensibles dans le code source ou les variables d'environnement statiques, le service s'interface avec **HashiCorp Vault**.
* Au démarrage, le conteneur s'authentifie pour récupérer dynamiquement les crédentials nécessaires à son fonctionnement, notamment les clés d'API pour la communication inter-services (vers le *Game Service*) et les secrets de chiffrement éventuels. Aucune clé n'est stockée "en dur" (hardcoded).


* **Monitoring et Observabilité (Prometheus)**
* Le service expose un endpoint HTTP dédié (`/metrics`) conforme au standard OpenMetrics.
* Il fournit des métriques techniques (utilisation CPU/RAM, Event Loop lag) mais surtout des **Indicateurs Clés de Performance (KPIs) métier** essentiels pour surveiller la santé du système :
* `current_queue_size` : Nombre de joueurs actuellement en attente (permet de détecter les goulots d'étranglement).
* `average_wait_time` : Temps moyen s'écoulant entre l'entrée en file et le succès du matchmaking (permet de valider l'efficacité de l'algorithme).




* **Centralisation des Logs (Stack ELK)**
* Le service n'écrit pas de logs dans des fichiers locaux volatils. Il émet ses journaux sur la sortie standard (`stdout`/`stderr`) dans un format **JSON structuré**.
* Ces flux sont capturés par l'infrastructure et acheminés vers la stack **ELK (Elasticsearch, Logstash, Kibana)**. Cette centralisation permet une analyse croisée des événements, facilitant le débogage et l'audit des sessions de matchmaking a posteriori.