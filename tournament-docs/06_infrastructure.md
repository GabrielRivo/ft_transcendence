# Infrastructure, Sécurité et Déploiement

### 1. Stratégie de Conteneurisation (Docker)

Contrairement aux autres services, le conteneur du Tournoi transporte son propre état via SQLite.

* **Image Docker :**
* Utilisation d'une image de base `node:alpine` ou `distroless` pour réduire la surface d'attaque.
* **Multi-stage build :** Séparation claire entre l'étape de compilation (avec `tsc` et les `devDependencies`) et l'étape de production (code JS pur + dépendances prod uniquement).


* **Persistance (Volumes) :**
* Déclaration d'un **Volume Docker** monté sur `/app/data` pour stocker le fichier `tournaments.db`.
* *Justification :* Si le conteneur est redémarré ou mis à jour, l'historique et les tournois en cours ne doivent pas être perdus.


* **Sécurité du Runtime :**
* Exécution en mode **Rootless** (User ID > 1000).


* *Constraint :* Gestion des permissions de lecture/écriture sur le volume monté pour l'utilisateur non-root.



### 2. Gestion des Secrets (HashiCorp Vault)

Intégration avec le module "Major Cybersecurity".

* **Workflow de Démarrage :**
1. Le conteneur démarre.
2. Le script d'entrée (entrypoint) s'authentifie auprès de Vault (AppRole ou Token).
3. Récupération sécurisée des secrets :
* `RABBITMQ_URI` : Pour la connexion au bus d'événements.
* `JWT_PUBLIC_KEY` : Pour valider les tokens utilisateurs.
* `DB_ENCRYPTION_KEY` : (Optionnel) Si nous choisissons de chiffrer certaines données sensibles dans SQLite (ex: JSON des brackets).




* **Isolation :** Aucune variable sensible n'est stockée dans le code ou le `Dockerfile`.

### 3. Observabilité : Logging (Stack ELK)

Intégration avec le module "DevOps - Log Management".

* **Format de Logs :** JSON structuré (ECS - Elastic Common Schema compatible).
* **Niveaux de Logs :**
* `INFO` : Création de tournoi, démarrage de round.
* `WARN` : Tentative de triche (ex: forcer un résultat de match), déconnexions fréquentes.
* `ERROR` : Échec de transaction SQLite, perte de connexion RabbitMQ.


* **Audit Trail :**
* Chaque modification de l'arbre de tournoi génère un log d'audit spécifique pour permettre de rejouer l'histoire en cas de litige ("Qui a validé ce score ?").



### 4. Observabilité : Métriques (Prometheus & Grafana)

Intégration avec le module "DevOps - Monitoring".

* **Métriques Métier (Business Metrics) :**
* `tournaments_active_count` (Gauge) : Nombre de tournois en cours.
* `tournaments_completed_total` (Counter) : Compteur historique.
* `average_tournament_duration_seconds` (Histogram).


* **Métriques Système :**
* Utilisation CPU/RAM (Critique pour le calcul des brackets si beaucoup de tournois simultanés).
* Latence des transactions SQLite.


* **Dashboards Grafana :** Visualisation en temps réel de la santé du service.

### 5. Sécurité Réseau (WAF & ModSecurity)

Protection derrière le pare-feu applicatif.

* **Configuration WSS :**
* Le WAF doit être configuré pour autoriser les connexions **WebSocket Secure** (Upgrade header) sur les routes `/api/tournament/ws`.


* **Rate Limiting :**
* Protection stricte sur l'endpoint de création `POST /api/tournaments` pour éviter le spam de tournois vides qui remplirait la base de données.



### 6. Contraintes de Scalabilité et Haute Disponibilité

Section honnête sur les limitations liées à l'architecture choisie.

* **Modèle "Singleton" :**
* À cause de l'utilisation de **SQLite** (fichier local verrouillé) et de la gestion d'état en mémoire, ce service **ne peut pas** être scalé horizontalement (avoir plusieurs instances `tournament-service` en parallèle sur la même DB est risqué sans configuration complexe type LiteFS).
* *Stratégie choisie :* Instance unique avec redémarrage automatique rapide (Vertical Scaling si besoin).


* **Arrêt Propre (Graceful Shutdown) :**
* Gestion des signaux `SIGTERM`.
* Le service doit terminer les transactions SQLite en cours et fermer proprement les connexions WebSocket avant de s'éteindre.