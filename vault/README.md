# HashiCorp Vault Configuration

Ce répertoire contient la configuration nécessaire pour HashiCorp Vault, utilisé pour la gestion centralisée des secrets.

## Structure

```
vault/
├── policies/               # Définitions des droits d'accès (HCL)
│   ├── auth-policy.hcl
│   └── ...
└── config/                 # Scripts/Configs d'initialisation
    └── k8s-auth-config.sh
```

## Intégration Kubernetes

L'authentification se fait via la méthode **Kubernetes Auth Method**.

1. **Policies** : Définissent quels secrets un service peut lire (`secret/data/production/auth-service` par exemple).
2. **Roles** : Lient un ServiceAccount Kubernetes à une Policy Vault.

## Workflow

1. Le pod démarre avec un ServiceAccount.
2. Il s'authentifie auprès de Vault via son token JWT K8s.
3. Vault vérifie le token et le rôle associé.
4. Vault retourne un token client Vault avec les permissions définies dans la policy.
5. L'application (ou External Secrets Operator) utilise ce token pour lire les secrets.
