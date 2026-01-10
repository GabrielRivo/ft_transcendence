# Schémas de Données et Persistance (SQLite)

### 1. Stratégie de Persistance

* 
**Technologie :** SQLite (Imposé par le module Database ).


* **Approche Hybride (Relationnel + Document) :**
* Utilisation du modèle relationnel classique pour les entités fixes (`Tournaments`, `Participants`).
* Utilisation du type **JSON** (supporté nativement par SQLite) pour stocker la structure dynamique de l'arbre de tournoi (`Bracket`).
* *Justification :* Reconstruire un arbre binaire complet via des jointures SQL récursives est inefficace et complexe. Stocker l'arbre sous forme d'objet JSON permet de charger l'état entier du tournoi, de le modifier en mémoire (via le `BracketEngine`), et de sauvegarder le nouvel état de manière atomique.



### 2. Diagramme Entité-Relation (ERD)

Une représentation visuelle simplifiée montrant la relation One-to-Many entre `Tournaments` et `Participants`.

### 3. Définition des Tables

#### 3.1 Table `tournaments`

C'est la table maîtresse qui contient la configuration et l'état courant.

| Colonne | Type | Description |
| --- | --- | --- |
| `id` | `UUID` (PK) | Identifiant unique du tournoi. |
| `name` | `VARCHAR` | Nom d'affichage (ex: "Midnight Cup"). |
| `status` | `VARCHAR` | Enum: `PENDING`, `IN_PROGRESS`, `FINISHED`, `CANCELLED`. |
| `size` | `INTEGER` | Nombre de slots (4, 8, 16). |
| `current_round` | `INTEGER` | Indicateur de progression (1, 2, 3...). |
| `bracket_data` | `JSON` | **Le cœur du système.** Contient la structure complète des nœuds et des matchs. |
| `created_by` | `UUID` | ID de l'utilisateur créateur (ou NULL si anonyme). |
| `created_at` | `DATETIME` | Timestamp de création. |
| `updated_at` | `DATETIME` | Timestamp de dernière modif. |

#### 3.2 Table `participants`

Liste des joueurs inscrits. Cette table permet de faire des requêtes analytiques (ex: "Combien de tournois a joué UserX ?") sans parser le JSON.

| Colonne | Type | Description |
| --- | --- | --- |
| `id` | `UUID` (PK) | ID unique de l'inscription. |
| `tournament_id` | `UUID` (FK) | Lien vers la table `tournaments`. |
| `user_id` | `UUID` | Lien vers le `User Service` (Nullable pour le mode Invité). |
| `alias` | `VARCHAR` | Nom d'affichage dans le tournoi (snapshot). |
| `rank` | `INTEGER` | Position finale (1 = Vainqueur, 2 = Finaliste, etc.). NULL tant que non éliminé. |

### 4. Structure JSON du `bracket_data`

Détail technique du contenu de la colonne JSON. C'est ici que réside la complexité "Métier".

* **Modèle de données :** Tableau de Nœuds (Matches) ou Structure Arborescente.
* **Exemple de Payload :**
```json
{
  "rounds": [
    {
      "round_number": 1,
      "matches": [
        {
          "match_id": "m1",
          "p1_id": "part_A",
          "p2_id": "part_B",
          "winner_id": null,
          "status": "scheduled" // ou "in_progress", "completed"
        },
        { "match_id": "m2", ... }
      ]
    },
    {
      "round_number": 2,
      "matches": [
        {
          "match_id": "m3",
          "p1_id": null, // Sera rempli par le vainqueur de m1
          "p2_id": null, // Sera rempli par le vainqueur de m2
          "source_match_p1": "m1",
          "source_match_p2": "m2"
        }
      ]
    }
  ]
}

```



### 5. Gestion des Transactions et Concurrence

Cette section explique comment on évite la corruption des données si deux matchs finissent en même temps.

* **Problème :** Race condition si deux instances du service essaient de mettre à jour `bracket_data` simultanément.
* **Solution :**
* Utilisation de transactions SQLite (`BEGIN TRANSACTION`).
* Pattern **Optimistic Locking** : Ajouter une colonne `version` (int) dans la table `tournaments`.
* Lors de l'update : `UPDATE tournaments SET bracket_data = $new, version = version + 1 WHERE id = $id AND version = $current_version`.
* Si 0 ligne modifiée -> Conflit détecté -> Recharger et réessayer.



### 6. Migrations et Initialisation

* Utilisation d'un outil de migration (inclus dans `my-fastify-decorators` ou script custom) pour créer les tables au démarrage du conteneur.
* Insertion de données de seed (tournois de test) si `NODE_ENV=development`.