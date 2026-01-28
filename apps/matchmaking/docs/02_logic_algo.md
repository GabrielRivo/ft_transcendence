# Algorithmes et Logique Métier

### 1. Introduction

* **Objectif**
Ce document technique a pour vocation d'expliciter le fonctionnement interne du moteur de décision du service de Matchmaking. Il définit les règles mathématiques et logiques qui gouvernent la sélection des adversaires, indépendamment de leur implémentation technique. L'objectif est de rendre transparent le processus par lequel le système analyse le bassin de joueurs disponibles pour transformer deux utilisateurs isolés en une paire compétitive valide.
* **Le Compromis Fondamental (The Trade-off)**
Toute la conception de cet algorithme repose sur la gestion d'une tension permanente entre deux métriques antagonistes :
1. **La Qualité du Match (Fairness) :** Elle se mesure par la proximité des niveaux de compétence (Delta ELO) entre les deux adversaires. Une qualité élevée garantit une partie disputée et équitable, évitant la frustration d'une défaite écrasante ou l'ennui d'une victoire trop facile.
2. **Le Temps d'Attente (Time to Match) :** Il correspond à la durée s'écoulant entre la demande de jeu et le début de la partie. Une attente prolongée augmente le risque d'abandon (Churn) et dégrade l'expérience utilisateur.


*Stratégie adoptée :* Il est impossible de maximiser ces deux variables simultanément. Notre algorithme adopte donc une approche dynamique : il privilégie une **qualité stricte** dans les premières secondes de l'attente, puis relâche progressivement les contraintes de niveau pour favoriser la **rapidité** à mesure que le temps passe, garantissant qu'aucun joueur ne reste bloqué indéfiniment dans la file.



### 2. Structure de Données (La File d'Attente)

L'efficacité de l'algorithme repose sur une modélisation rigoureuse de l'état des joueurs en attente. Contrairement à une base de données relationnelle, cette structure est maintenue en mémoire vive (In-Memory) pour garantir une latence d'accès minimale lors des itérations rapides de la boucle de jeu.

#### L'Entité `QueuedPlayer`

Chaque joueur entrant dans le système est instancié sous la forme d'un objet normalisé `QueuedPlayer`. Cet objet contient toutes les métadonnées nécessaires à la prise de décision, sans nécessiter de requêtes externes supplémentaires.

```typescript
interface QueuedPlayer {
  userId: string;       // UUID v4 (Identité persistante)
  socketId: string;     // ID de connexion (Pour la notification temps réel)
  elo: number;          // Score de compétence au moment de l'inscription
  joinTime: number;     // Timestamp (Date.now()) d'entrée en file
  rangeFactor: number;  // Multiplicateur dynamique de tolérance (défaut: 1)
}
```

* **`joinTime` :** Cette propriété est critique. Elle sert de référence temporelle pour calculer la durée d'attente (`currentTime - joinTime`) et déterminer si le joueur est éligible à un élargissement de ses critères de recherche.
* **`rangeFactor` :** Ce compteur d'état évolue au fil du temps. Initialisé à 1 (recherche stricte), il s'incrémente périodiquement, indiquant que le joueur est prêt à accepter un écart de niveau plus important pour trouver un match.

#### Organisation de la Collection en Mémoire

Pour stocker ces objets, le service utilise une structure de liste linéaire (Array ou LinkedList).

* **Topologie :** La file est gérée comme un conteneur unique pour un mode de jeu donné (ex: `standardQueue: QueuedPlayer[]`).
* **Volatilité :** Cette collection est volatile. En cas de redémarrage du service, la file est purgée. La persistance n'est pas requise ici car une demande de matchmaking est, par nature, éphémère et liée à une connexion WebSocket active.

#### Stratégie d'Accès et de Tri (Priorité Temporelle)

L'ordre de traitement des joueurs n'est pas aléatoire. Il suit une logique **FIFO (First In, First Out)** stricte pour garantir l'équité temporelle et éviter la "famine" (starvation) des requêtes.

1. **Insertion :** Les nouveaux arrivants sont ajoutés à la fin de la liste (`push`).
2. **Itération :** Lors de chaque cycle de matchmaking (Tick), l'algorithme parcourt la liste du début vers la fin.
3. **Priorité :** Le joueur en tête de liste (celui qui attend depuis le plus longtemps) est toujours le "Demandeur" prioritaire. Le système tente de lui trouver un adversaire compatible (le "Candidat") dans le reste de la liste. Cette approche assure que le temps d'attente moyen est lissé pour l'ensemble des utilisateurs.



### 3. Algorithme d'Élargissement de Plage (Range Expansion)

Ce mécanisme, souvent désigné sous le terme de **"Bucket Expansion"**, constitue le cœur réactif du système. Il résout le problème de l'attente indéfinie en modifiant dynamiquement les critères d'acceptabilité d'un match au fil du temps.

* **Concept : La Fenêtre de Recherche**
Au moment de son entrée dans la file, chaque joueur se voit attribuer une "fenêtre de pertinence". Pour qu'un adversaire potentiel soit validé, son score ELO doit impérativement se situer à l'intérieur de cet intervalle.
Mathématiquement, pour un joueur $P$ ayant un score $E_p$ et une tolérance actuelle $\delta_t$, l'intervalle de recherche valide est défini par :
$$Intervalle = [E_p - \delta_t, E_p + \delta_t]$$

* **Paramétrage et Formule de Croissance**
L'évolution de la tolérance $\delta_t$ n'est pas continue mais s'effectue par paliers discrets pour optimiser les performances de calcul. Les constantes suivantes régissent l'algorithme (configurables via variables d'environnement) :
* `BASE_TOLERANCE` (ex: 50 points) : L'écart maximal accepté à $t=0$. Cela garantit que les matchs instantanés sont toujours très équilibrés.
* `EXPANSION_STEP` (ex: 50 points) : La valeur ajoutée à la tolérance à chaque palier.
* `EXPANSION_INTERVAL` (ex: 5000 ms) : La fréquence à laquelle la tolérance est recalculée.
* `MAX_TOLERANCE` (ex: 1000 points) : Une borne supérieure ("Cap") pour éviter des matchs totalement aberrants (ex: un débutant contre un grand maître), sauf si le mode "Force Match" est activé.


* **Logique Temporelle (`updateTolerance`)**
À chaque itération de la boucle de matchmaking (Game Loop), le système exécute une fonction de mise à jour pour chaque joueur en attente.
La logique pseudocode est la suivante :
1. Calculer le temps d'attente : $\Delta t = T_{now} - T_{join}$.
2. Calculer le nombre de paliers franchis : $Steps = \lfloor \frac{\Delta t}{EXPANSION\_INTERVAL} \rfloor$.
3. Mettre à jour la tolérance actuelle du joueur :
$$\delta_{current} = BASE\_TOLERANCE + (Steps \times EXPANSION\_STEP)$$
4. Si $\delta_{current} > MAX\_TOLERANCE$, alors $\delta_{current} = MAX\_TOLERANCE$ (saturation).


Cette approche garantit qu'un joueur attendant depuis 30 secondes aura une fenêtre d'acceptation beaucoup plus large qu'un joueur venant d'arriver, augmentant exponentiellement ses chances de trouver une partie.



### 4. La Boucle de Matchmaking (The Game Loop)

Contrairement à une approche purement réactive (qui ne déclencherait une vérification qu'à l'arrivée d'un nouveau joueur), le service de Matchmaking repose sur un processus itératif constant. Cette architecture est nécessaire pour gérer la dimension temporelle de l'algorithme : même si aucun nouveau joueur ne rejoint la file, l'état des joueurs présents évolue (leur tolérance s'élargit), ce qui peut débloquer de nouvelles paires valides.

* **Fréquence (Tick Rate)**
Le cycle est piloté par une minuterie interne (`setInterval`) qui s'exécute à une fréquence définie, par exemple toutes les **1000ms à 3000ms** (configurable via `MATCHMAKING_TICK_RATE`). Ce délai offre un compromis optimal entre la réactivité perçue par l'utilisateur et la charge CPU du serveur.

* **Étapes du Cycle (Lifecycle Steps)**
À chaque "Tick", le moteur exécute séquentiellement les opérations suivantes :

1. **Nettoyage (Pruning)**
* **Objectif :** Garantir l'intégrité de la file.
* **Action :** Le système vérifie l'état de connexion de chaque socket. Tout joueur dont la connexion est interrompue (déconnexion volontaire ou timeout du heartbeat) est immédiatement retiré de la mémoire. Cela empêche de matcher un utilisateur actif avec un "fantôme".

2. **Mise à jour d'État (Update)**
* **Objectif :** Faire avancer la logique temporelle.
* **Action :** Pour chaque joueur restant, la méthode `updateTolerance()` est appelée. Leurs fenêtres de recherche ($[Min, Max]$) sont recalculées en fonction du temps écoulé depuis leur inscription.

3. **Appariement (Matching Logic)**
* **Objectif :** Identifier les paires compatibles.
* **Algorithme :**
* On itère sur la liste des joueurs, du plus ancien (Prioritaire) au plus récent. Soit $P1$ le joueur courant (le "Demandeur").
* On cherche dans le reste de la liste un joueur $P2$ (le "Candidat").
* **Condition de Compatibilité Mutuelle :** Un match n'est validé que si et seulement si les deux joueurs sont acceptables l'un pour l'autre :
$$(ELO_{P2} \in Range_{P1}) \quad \text{ET} \quad (ELO_{P1} \in Range_{P2})$$

* *Note :* Cette double vérification est cruciale pour éviter qu'un joueur attendant depuis longtemps (tolérance large) ne "capture" un joueur venant d'arriver (tolérance stricte) si ce dernier cherche un match plus équilibré.

4. **Exécution et Commit (Handover)**
* **Objectif :** Finaliser la transaction.
* **Action :**
* Dès qu'une paire $(P1, P2)$ est identifiée, elle est **atomiquement retirée** de la file d'attente pour éviter toute double sélection.
* Un objet "Match Proposal" est instancié.
* Le processus déclenche l'appel asynchrone vers le **Game Service** (via API REST) pour créer la session, puis notifie les deux clients via WebSocket.



### 5. Gestion des Cas Limites (Edge Cases)

Un algorithme robuste ne se définit pas seulement par son comportement dans des conditions idéales, mais par sa capacité à gérer les exceptions et les extrêmes. Le service intègre des mécanismes de protection spécifiques pour ces scénarios.

* **La Famine (Starvation) et les "Outliers"**
* **Problème :** Un joueur possédant un score ELO extrême (ex: 3000, Top 0.1%) risque de ne jamais trouver d'adversaire si la population actuelle ne contient que des joueurs débutants (ELO 800).
* **Solution : Saturation de la Tolérance.**
L'algorithme garantit mathématiquement qu'aucun joueur ne reste bloqué indéfiniment. Grâce à l'expansion de plage, la fenêtre de recherche finit par atteindre la valeur `MAX_TOLERANCE` (ou l'infini, selon la configuration). À ce stade critique, le système bascule en mode "Best Effort" : il acceptera le joueur disponible le plus proche, même si l'écart de niveau est massif. La philosophie adoptée est qu'il vaut mieux jouer un match déséquilibré que d'attendre 20 minutes sans jouer.

* **Concurrence et Intégrité des Données**
* **Problème :** Dans un cycle de matchmaking rapide, il existe un risque théorique qu'un joueur $P1$ soit sélectionné pour un match avec $P2$, et que dans la même itération, $P1$ soit également considéré comme candidat pour un match avec $P3$.
* **Solution : Retrait Atomique (Atomic Removal).**
Bien que Node.js soit monothread (évitant les *Race Conditions* classiques de mémoire partagée), la logique séquentielle doit être stricte. Dès qu'une paire $(P1, P2)$ est validée par l'algorithme :
1. Les deux entités sont **immédiatement** retirées de la structure de données (`Array.splice` ou suppression de Map).
2. Ce retrait s'effectue *avant* toute opération asynchrone (comme l'appel API vers le Game Service).
Cela garantit que pour la suite de l'itération en cours ou les cycles suivants, $P1$ et $P2$ n'existent plus dans la file, rendant impossible tout double appariement.

* **Annulation Volontaire (User Cancel)**
* **Problème :** Un utilisateur change d'avis et clique sur "Annuler" quelques millisecondes avant d'être matché.
* **Solution :**
Le service expose un événement explicite `leave_queue`. Lorsqu'il est reçu :
1. Le service recherche l'utilisateur dans la file via son `userId` ou `socketId`.
2. S'il est trouvé, il est supprimé et une confirmation est renvoyée.
3. **Idempotence :** Si l'utilisateur n'est pas trouvé (déjà matché ou jamais inscrit), l'opération est ignorée silencieusement sans générer d'erreur, assurant la fluidité de l'expérience côté client.



### 6. Paramètres Configurables

Afin de permettre un ajustement fin du comportement du matchmaking sans nécessiter de redéploiement du code, les constantes algorithmiques sont exposées via des variables d'environnement. Ces paramètres permettent aux administrateurs de modifier la "personnalité" du système (privilégier la rapidité ou l'équité) en fonction de la charge serveur et de la population de joueurs.

* **`MATCHMAKING_TICK_RATE_MS`**
    * **Description :** Fréquence d'exécution de la boucle principale de matchmaking (Game Loop).
    * **Impact :** Définit la réactivité du système.
        * Une valeur basse (ex: `1000`) rend le matchmaking très réactif mais augmente la charge CPU (plus d'itérations).
        * Une valeur haute (ex: `5000`) économise les ressources mais introduit une latence perceptible avant le démarrage de la partie.
    * **Valeur par défaut recommandée :** `2000` (2 secondes).

* **`INITIAL_ELO_RANGE`**
    * **Description :** Tolérance initiale de l'écart de niveau acceptée au moment précis où un joueur rejoint la file ($t=0$).
    * **Impact :** Définit la sévérité du filtrage initial. Une valeur faible garantit que les matchs "instantanés" sont toujours très équilibrés.
    * **Valeur par défaut recommandée :** `50` (Le joueur cherche un adversaire ayant $\pm 50$ points ELO).

* **`EXPANSION_STEP_ELO`**
    * **Description :** Valeur ajoutée à la tolérance à chaque palier d'élargissement.
    * **Impact :** Contrôle la vitesse à laquelle le système "relâche" ses critères de qualité. Une valeur élevée accélère la convergence vers un match, au risque de créer des disparités de niveau plus rapidement.
    * **Valeur par défaut recommandée :** `100` (La fenêtre s'agrandit de $\pm 100$ points par étape).

* **`EXPANSION_INTERVAL_SEC`**
    * **Description :** Durée (en secondes) nécessaire pour franchir un palier et déclencher l'ajout du `EXPANSION_STEP_ELO`.
    * **Impact :** Détermine la "patience" de l'algorithme.
    * **Valeur par défaut recommandée :** `5` (Toutes les 5 secondes, la recherche s'élargit).