# Scripts d'Automatisation

Ce répertoire contient les scripts shell pour l'installation, l'initialisation et la maintenance de l'infrastructure.

## Liste des Scripts

| Script            | Description                                                           |
| ----------------- | --------------------------------------------------------------------- |
| `setup-k3s.sh`    | Installe K3s et les outils CLI nécessaires (kubectl, helm)            |
| `setup-vault.sh`  | Initialise Vault, active K8s Auth et configure les moteurs de secrets |
| `init-secrets.sh` | Popule les secrets initiaux (pour le développement)                   |
| `health-check.sh` | Vérifie l'état de santé de tous les composants du cluster             |

## Utilisation

La plupart de ces scripts sont appelés automatiquement via le `Makefile` à la racine du module infrastructure.

```bash
# Exemple d'exécution manuelle
./setup-k3s.sh
```

## Bonnes Pratiques

- Tous les scripts doivent être exécutables (`chmod +x`).
- Utiliser `set -e` pour arrêter l'exécution en cas d'erreur.
- Logger les étapes importantes avec des echos explicites.
