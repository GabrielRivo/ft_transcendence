# Chat Service

## Fonctionnalites

-> lister utilisateurs connectes
-> Gestion de liste d'amis : ajouter + supprimer
-> Envoyer un message (general, rooms, prive)
-> Bloquer un utilisateur
-> Defier un utilisateur en match simple
-> Inviter un utilisateur a un tournoi
-> acceder au profil
-> Historiser le chat

## API

route principale : /api
identifiant microservice : /chat

Ajouter en ami : POST /friend {userId} 
Supprimer un ami : DELETE /friend
Bloquer : Post /bloc , DELETE /friend
Debloquer : DELETE /bloc

Defier : only si connecte : websocket / POST /user.available + otheruser.available = false/true
Inviter a un tournois : websocket / POST user + si oui :  POST/tournament/add-player 


## BDD

friends
{
	userId1, friendId1
	userId1, friendId2
}

bloclist
{
	userId1, blocked1
	userId1, blocked2
}

historique des matchs :
{
	gameId, userId1, userId2, score
}

generalChatHistory
{
	msgId, userId1, datetetime, message
}

privateChatHistory 
{
	msgId, userId1, UserId2, datetetime, message
}


{
	1, 2
	1, 3
	1, 4
}


```sql
SELECT friend_id FROM friends WHERE userId = 1
```





Voici un modèle (template) complet en Markdown que vous pouvez copier-coller pour documenter chacune de vos routes de manière uniforme et professionnelle.

---

# 📝 Template de Conception de Route API

## 1. Informations Générales

* **Route :** `[METHODE] /chemin/de/la/route`

| Nom | Type | Requis | Description |
| --- | --- | --- | --- |
| `id` | `UUID` | Oui | L'identifiant unique de la ressource. |

## 3. Corps de la Requête (Request Body)

*Format : JSON*

```json
{
  "champ1": "valeur",
  "champ2": 123,
  "champ_optionnel": "exemple"
}
```

## 4. Réponses (Responses)

### ✅ Succès (200 OK / 201 Created)

```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "createdAt": "2023-10-27T10:00:00Z"
  }
}
```

### Erreurs

| Code HTTP | Message / Contexte | Solution possible |
| --- | --- | --- |
| **400** | `INVALID_INPUT` | Vérifier le format du champ `email`. |
| **401** | `UNAUTHORIZED` | Token manquant ou expiré. |
| **404** | `NOT_FOUND` | La ressource demandée n'existe pas. |
