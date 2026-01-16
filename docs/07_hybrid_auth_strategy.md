# Stratégie d'Authentification Hybride

### 1. Contexte et Objectif

Le sujet impose une double compatibilité pour le service de tournoi :
- **Mode Mandatory (Invité)** : Les joueurs participent via un simple alias, sans compte utilisateur.
- **Mode Module User Management** : Les joueurs authentifiés participent avec leur compte, permettant l'historisation des stats.

Ce document décrit la stratégie d'implémentation permettant de supporter ces deux modes avec un **impact minimal sur l'architecture existante**.

### 2. Rappel de l'Abstraction Participant

Comme défini dans `00_overview.md`, le service utilise une entité générique `Participant` :

```typescript
interface Participant {
    id: string;           // UUID généré (guest) ou ID utilisateur (registered)
    alias: string;        // Nom d'affichage dans le tournoi
    type: 'guest' | 'registered';
    userId: number | null; // Référence vers User Service (null pour invités)
}
```

Cette abstraction permet d'utiliser le **même moteur de tournoi** pour les deux modes sans dupliquer le code.

---

## 3. Modifications Backend

### 3.1 Création de l'`OptionalAuthGuard`

**Fichier à créer :** `apps/auth/src/auth/guards/optional-auth.guard.ts`

Contrairement à l'`AuthGuard` existant qui rejette les requêtes sans token, ce guard :
- Valide le JWT si présent et enrichit `req.user`
- Laisse passer la requête avec `req.user = null` si pas de token ou token invalide

```typescript
import { Guard, CanActivateContext, Service, Inject } from 'my-fastify-decorators';
import { AuthService } from '../auth.service.js';
import config from '../../config.js';

@Service()
export class OptionalAuthGuard implements Guard {
    @Inject(AuthService)
    private authService!: AuthService;

    async canActivate(context: CanActivateContext): Promise<boolean> {
        const { req } = context;
        const accessToken = (req.cookies as Record<string, string>)?.[config.accessTokenName];

        if (!accessToken) {
            (req as any).user = null;
            return true; // Laisser passer en mode invité
        }

        try {
            const payload = this.authService.verifyAccessToken(accessToken);
            (req as any).user = payload;
        } catch {
            (req as any).user = null; // Token invalide = mode invité
        }
        
        return true; // Toujours laisser passer
    }
}
```

**Export à ajouter :** `apps/auth/src/auth/guards/index.ts`
```typescript
export { AuthGuard } from './auth.guard.js';
export { OptionalAuthGuard } from './optional-auth.guard.js';
```

---

### 3.2 Service `ParticipantService` du Tournament

**Fichier à créer :** `apps/tournament/src/participant/participant.service.ts`

Ce service centralise la création et la gestion des participants, qu'ils soient authentifiés ou invités.

```typescript
import { Service } from 'my-fastify-decorators';
import { v4 as uuidv4 } from 'uuid';
import type { JwtPayload } from '@auth/auth.service'; // Type partagé

export interface Participant {
    id: string;
    alias: string;
    type: 'guest' | 'registered';
    userId: number | null;
}

export interface GuestInfo {
    alias: string;
    sessionId?: string; // ID persistant pour la session WebSocket
}

@Service()
export class ParticipantService {
    
    /**
     * Crée un Participant normalisé à partir des informations disponibles.
     * - Si `user` est présent : mode authentifié
     * - Sinon : mode invité avec les infos de `guestInfo`
     */
    createParticipant(user: JwtPayload | null, guestInfo?: GuestInfo): Participant {
        if (user) {
            return {
                id: user.id.toString(),
                alias: user.username,
                type: 'registered',
                userId: user.id,
            };
        }

        if (!guestInfo?.alias) {
            throw new Error('Alias requis pour les participants invités');
        }

        return {
            id: guestInfo.sessionId || uuidv4(),
            alias: guestInfo.alias,
            type: 'guest',
            userId: null,
        };
    }

    /**
     * Valide qu'un alias invité est acceptable.
     */
    validateGuestAlias(alias: string): { valid: boolean; error?: string } {
        if (!alias || alias.trim().length === 0) {
            return { valid: false, error: 'Alias requis' };
        }
        if (alias.length < 2 || alias.length > 20) {
            return { valid: false, error: 'Alias doit contenir entre 2 et 20 caractères' };
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
            return { valid: false, error: 'Alias ne peut contenir que lettres, chiffres, _ et -' };
        }
        return { valid: true };
    }
}
```

---

### 3.3 Contrôleur Tournament avec Authentification Hybride

**Fichier à modifier :** `apps/tournament/src/tournament/tournament.controller.ts`

```typescript
import { Controller, Post, Get, Body, Param, UseGuards, JWTBody } from 'my-fastify-decorators';
import { OptionalAuthGuard } from '@auth/guards/optional-auth.guard.js';
import { TournamentService } from './tournament.service.js';
import { ParticipantService } from '../participant/participant.service.js';
import type { JwtPayload } from '@auth/auth.service';

@Controller('/api/tournaments')
@UseGuards(OptionalAuthGuard) // Appliqué à tout le contrôleur
export class TournamentController {

    constructor(
        private tournamentService: TournamentService,
        private participantService: ParticipantService,
    ) {}

    @Post('/')
    async create(
        @JWTBody() user: JwtPayload | null,
        @Body() body: CreateTournamentDto
    ) {
        const creator = this.participantService.createParticipant(user, {
            alias: body.creatorAlias || 'Organisateur',
        });
        return this.tournamentService.create(body, creator);
    }

    @Post('/:id/join')
    async join(
        @Param('id') tournamentId: string,
        @JWTBody() user: JwtPayload | null,
        @Body() body: JoinTournamentDto
    ) {
        // Validation de l'alias si mode invité
        if (!user) {
            const validation = this.participantService.validateGuestAlias(body.alias);
            if (!validation.valid) {
                throw new BadRequestException(validation.error);
            }
        }

        const participant = this.participantService.createParticipant(user, {
            alias: body.alias,
        });

        return this.tournamentService.join(tournamentId, participant);
    }

    @Get('/:id')
    async getById(@Param('id') id: string) {
        return this.tournamentService.getById(id);
    }
}
```

---

### 3.4 Gateway WebSocket avec Identification Hybride

**Fichier à modifier :** `apps/tournament/src/tournament/tournament.gateway.ts`

```typescript
import { 
    WebSocketGateway, 
    SubscribeConnection, 
    SubscribeDisconnection,
    SubscribeMessage,
    Socket,
    JWTBody,
    MessageBody 
} from 'my-fastify-decorators';
import { v4 as uuidv4 } from 'uuid';
import type { Socket as SocketType } from 'socket.io';
import type { JwtPayload } from '@auth/auth.service';
import { ParticipantService, Participant } from '../participant/participant.service.js';

// Extension du type Socket pour stocker le participant
declare module 'socket.io' {
    interface Socket {
        data: {
            participant?: Participant;
            tournamentId?: string;
        };
    }
}

@WebSocketGateway('/tournament')
export class TournamentGateway {

    constructor(private participantService: ParticipantService) {}

    @SubscribeConnection()
    handleConnection(@Socket() socket: SocketType, @JWTBody() user: JwtPayload | null) {
        if (user) {
            // Mode authentifié : utiliser les infos du JWT
            socket.data.participant = {
                id: user.id.toString(),
                alias: user.username,
                type: 'registered',
                userId: user.id,
            };
            console.log(`[WS] Utilisateur connecté: ${user.username} (ID: ${user.id})`);
        } else {
            // Mode invité : récupérer l'alias du handshake
            const guestId = socket.handshake.auth?.guestId || uuidv4();
            const alias = socket.handshake.auth?.alias;

            if (!alias) {
                socket.emit('error', { message: 'Alias requis pour les invités' });
                socket.disconnect();
                return;
            }

            const validation = this.participantService.validateGuestAlias(alias);
            if (!validation.valid) {
                socket.emit('error', { message: validation.error });
                socket.disconnect();
                return;
            }

            socket.data.participant = {
                id: guestId,
                alias: alias,
                type: 'guest',
                userId: null,
            };

            // Renvoyer le guestId au client pour persistance locale
            socket.emit('guest_registered', { guestId });
            console.log(`[WS] Invité connecté: ${alias} (Session: ${guestId})`);
        }
    }

    @SubscribeMessage('join_room')
    handleJoinRoom(
        @Socket() socket: SocketType,
        @MessageBody() data: { tournamentId: string }
    ) {
        if (!socket.data.participant) {
            socket.emit('error', { message: 'Non identifié' });
            return;
        }

        socket.join(`tournament:${data.tournamentId}`);
        socket.data.tournamentId = data.tournamentId;

        // Notifier le lobby
        socket.to(`tournament:${data.tournamentId}`).emit('lobby_update', {
            action: 'join',
            participant: socket.data.participant,
        });
    }

    @SubscribeDisconnection()
    handleDisconnection(@Socket() socket: SocketType) {
        if (socket.data.participant && socket.data.tournamentId) {
            socket.to(`tournament:${socket.data.tournamentId}`).emit('lobby_update', {
                action: 'leave',
                participant: socket.data.participant,
            });
        }
    }
}
```

---

## 4. Configuration Infrastructure (NGINX)

Pour permettre l'accès aux utilisateurs invités (qui n'ont pas de JWT), il est impératif de désactiver la pré-authentification NGINX sur les routes concernées.

**Fichier à modifier :** `nginx/nginx.dev.conf` (et équivalent Prod)

Les blocs `location /api/game/` et `location /api/tournament/` doivent **retirer** les directives suivantes :

```nginx
# À SUPPRIMER pour ces routes spécifiques
auth_request /internal/auth/verify;
auth_request_set $auth_user_id $upstream_http_x_user_id;
# ...
```

**Conséquence Technique :**
Le backend ne recevra plus les headers `X-User-Id` et `X-User-Email` injectés par NGINX. C'est pourquoi l'`OptionalAuthGuard` et le `GameGateway` doivent impérativement décoder et vérifier eux-mêmes le token JWT (via la clé publique partagée).

---

## 5. Modifications du Service Game

Le service Game est actuellement conçu pour n'accepter que des utilisateurs authentifiés. Les modifications suivantes sont nécessaires pour supporter les joueurs invités dans le contexte des tournois.

### 5.1 Problème Identifié

Le `GameGateway` actuel rejette toute connexion sans JWT valide :

```typescript
// apps/game/src/game/game.gateway.ts (ligne 108)
if (!user || typeof user.id !== 'number' || user.id <= 0) {
    client.emit('error', { code: GameConnectionError.AUTH_REQUIRED, ... });
    client.disconnect(true);
    return;
}
```

**Impact :** Un joueur invité du tournoi ne peut pas se connecter au Game Service pour jouer son match.

### 5.2 Solution : Extension du Type d'Identification

**Point positif :** Le `GameService` utilise déjà des **strings** pour les player IDs, ce qui permet d'accepter des UUIDs invités sans modification du cœur du service.

#### 4.2.1 Nouveau Type `PlayerIdentity`

**Fichier à modifier :** `apps/game/src/game/types.ts`

```typescript
// Ajouter après JwtPayload

/**
 * Représente l'identité d'un joueur, qu'il soit authentifié ou invité.
 * Utilisé par le GameGateway pour identifier les connexions.
 */
export interface PlayerIdentity {
    /** ID unique du joueur (userId string ou guestId UUID) */
    id: string;
    
    /** Nom d'affichage */
    alias: string;
    
    /** Type de participant */
    type: 'registered' | 'guest';
    
    /** ID utilisateur numérique (null pour les invités) */
    userId: number | null;
}

/**
 * Informations d'authentification invité envoyées dans le handshake.
 */
export interface GuestAuth {
    guestId: string;
    alias: string;
}
```

#### 4.2.2 Modification du `GameGateway`

**Fichier à modifier :** `apps/game/src/game/game.gateway.ts`

```typescript
import {
    Inject,
    SubscribeConnection,
    SubscribeDisconnection,
    SubscribeMessage,
    WebSocketGateway,
    ConnectedSocket,
    MessageBody,
    JWTBody,
} from 'my-fastify-decorators';
import { Socket } from 'socket.io';
import { GameService } from './game.service.js';
import { 
    GameConnectionError, 
    type JwtPayload, 
    type PlayerIdentity,
    type GuestAuth 
} from './types.js';

/**
 * Extended Socket type with typed data property for game sessions.
 */
interface GameSocket extends Socket {
    data: {
        /** Player identity (authenticated or guest) */
        player?: PlayerIdentity;
    };
}

@WebSocketGateway()
export class GameGateway {
    @Inject(GameService)
    private gameService!: GameService;

    private playerSockets: Map<string, GameSocket> = new Map();
    private connectedCount = 0;

    /**
     * Handles new WebSocket connections with hybrid authentication.
     * 
     * Supports two modes:
     * 1. Authenticated: JWT token in handshake -> extract user info
     * 2. Guest: guestId + alias in handshake.auth -> validate and use
     */
    @SubscribeConnection()
    handleConnection(
        @ConnectedSocket() client: GameSocket,
        @JWTBody() user: JwtPayload | undefined,
    ): void {
        const socketId = client.id;
        let player: PlayerIdentity;

        // =====================================================================
        // Mode 1: Authentification JWT (utilisateurs enregistrés)
        // =====================================================================
        if (user && typeof user.id === 'number' && user.id > 0) {
            player = {
                id: String(user.id),
                alias: user.username || `User${user.id}`,
                type: 'registered',
                userId: user.id,
            };
            console.log(
                `[GameGateway] Authenticated user connected: ${player.alias} (ID: ${player.id})`
            );
        }
        // =====================================================================
        // Mode 2: Authentification Invité (tournois)
        // =====================================================================
        else {
            const guestAuth = client.handshake.auth as GuestAuth | undefined;
            
            if (!guestAuth?.guestId || !guestAuth?.alias) {
                console.warn(
                    `[GameGateway] Connection rejected: No valid JWT or guest credentials | SocketId: ${socketId}`
                );
                client.emit('error', {
                    code: GameConnectionError.AUTH_REQUIRED,
                    message: 'Authentication required. Provide JWT token or guest credentials.',
                });
                client.disconnect(true);
                return;
            }

            // Validation basique de l'alias invité
            if (guestAuth.alias.length < 2 || guestAuth.alias.length > 20) {
                client.emit('error', {
                    code: GameConnectionError.INVALID_TOKEN,
                    message: 'Invalid guest alias: must be 2-20 characters',
                });
                client.disconnect(true);
                return;
            }

            player = {
                id: guestAuth.guestId,
                alias: guestAuth.alias,
                type: 'guest',
                userId: null,
            };
            console.log(
                `[GameGateway] Guest connected: ${player.alias} (GuestID: ${player.id})`
            );
        }

        // Store player identity in socket data
        client.data.player = player;
        this.connectedCount++;

        // Handle reconnection (disconnect old socket for same player)
        const existingSocket = this.playerSockets.get(player.id);
        if (existingSocket) {
            console.log(
                `[GameGateway] Reconnection detected for ${player.id}. Disconnecting old socket.`
            );
            existingSocket.disconnect(true);
        }
        this.playerSockets.set(player.id, client);

        // Connect player to their pending game
        const result = this.gameService.connectPlayer(client, player.id);

        if (result.success) {
            console.log(`[GameGateway] Player ${player.alias} connected to game ${result.gameId}`);
            client.emit('game_connected', {
                status: 'connected',
                gameId: result.gameId,
                player: { id: player.id, alias: player.alias, type: player.type },
                message: `Connected to game ${result.gameId}. Waiting for game to start...`,
            });
        } else {
            console.log(`[GameGateway] Connection rejected for ${player.alias}: ${result.error}`);
            client.emit('error', {
                code: result.error,
                message: result.message,
            });
            this.playerSockets.delete(player.id);
            this.connectedCount--;
            client.disconnect(true);
        }
    }

    @SubscribeDisconnection()
    handleDisconnect(@ConnectedSocket() client: GameSocket): void {
        const player = client.data.player;

        if (player) {
            if (this.playerSockets.get(player.id) === client) {
                this.playerSockets.delete(player.id);
            }
            this.gameService.disconnectPlayer(client, player.id);
        }

        this.connectedCount--;
        console.log(
            `[GameGateway] Client ${client.id} (${player?.alias || 'unknown'}) disconnected. ` +
            `Total connected: ${this.connectedCount}`
        );
    }

    @SubscribeMessage('playerDirection')
    handlePlayerInput(@ConnectedSocket() client: GameSocket, @MessageBody() data: any): void {
        const playerId = client.data.player?.id;
        if (playerId) {
            this.gameService.onPlayerInput(client, playerId, data);
        }
    }

    @SubscribeMessage('ping')
    handlePing(@ConnectedSocket() client: GameSocket): void {
        client.emit('pong');
    }
}
```

#### 4.2.3 Ajustement du `GameService`

**Fichier à modifier :** `apps/game/src/game/game.service.ts`

Les méthodes `connectPlayer`, `disconnectPlayer` et `onPlayerInput` doivent recevoir le `playerId` en paramètre explicite au lieu de le lire depuis `client.data.userId` :

```typescript
// Signature modifiée
public connectPlayer(client: Socket, playerId: string): ConnectPlayerResult {
    if (!playerId) {
        return {
            success: false,
            error: 'INVALID_USER_ID',
            message: 'Player ID is required to connect to a game',
        };
    }

    const game = this.gamesByPlayer.get(playerId);
    if (!game) {
        return {
            success: false,
            error: 'NO_PENDING_GAME',
            message: 'No pending game found. Please join matchmaking queue first.',
        };
    }

    game.playerConnected(client, playerId);
    return { success: true, gameId: game.id };
}

public disconnectPlayer(client: Socket, playerId: string): void {
    if (!playerId) return;
    
    const game = this.gamesByPlayer.get(playerId);
    if (game) {
        game.playerDisconnected(client, playerId);
    }
}

public async onPlayerInput(client: Socket, playerId: string, data: any): Promise<void> {
    const game = this.gamesByPlayer.get(playerId);
    if (game && game.inputManager) {
        game.inputManager.recordInput(client, playerId, data);
    }
}
```

### 5.3 Communication Tournament → Game

Lorsque le Tournament Service doit lancer un match, il appelle l'API du Game Service :

```typescript
// Dans TournamentService
async launchMatch(participant1: Participant, participant2: Participant): Promise<string> {
    const gameId = `tournament-match-${uuidv4()}`;
    
    const response = await fetch('http://game:3000/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            gameId,
            player1Id: participant1.id,  // Peut être un userId ou un guestId
            player2Id: participant2.id,
        }),
    });
    
    if (!response.ok) {
        throw new Error('Failed to create game');
    }
    
    // Notifier les participants via WebSocket
    this.notifyMatchReady(participant1, participant2, gameId);
    
    return gameId;
}
```

**Le Game Service accepte déjà des player IDs sous forme de strings**, donc cette communication fonctionne sans modification supplémentaire.

### 5.4 Connexion Frontend pour les Invités

Le frontend doit adapter la connexion WebSocket selon le type de joueur :

```typescript
// apps/frontend/src/hook/useGameSocket.ts

function connectToGame(gameId: string, participant: Participant) {
    const authPayload = participant.type === 'registered'
        ? { token: getAccessToken() }  // JWT pour utilisateurs auth
        : { guestId: participant.id, alias: participant.alias };  // Credentials invité

    const socket = io('/game', {
        auth: authPayload,
        query: { gameId },
    });

    return socket;
}
```

### 5.5 Résumé des Modifications Game Service

| Fichier | Modification |
|---------|--------------|
| `apps/game/src/game/types.ts` | Ajouter `PlayerIdentity` et `GuestAuth` |
| `apps/game/src/game/game.gateway.ts` | Authentification hybride (JWT ou guest credentials) |
| `apps/game/src/game/game.service.ts` | Recevoir `playerId` en paramètre explicite |
| `apps/game/src/game/pong/Game/Pong.ts` | Adapter `playerConnected`/`playerDisconnected` si nécessaire |

---

## 6. Modifications Frontend

### 6.1 Nouveau Layout `HybridLayout`

**Fichier à créer :** `apps/frontend/src/layout/HybridLayout.tsx`

Un layout qui permet l'accès authentifié OU invité, sans redirection forcée.

```tsx
import { createElement, Element, FragmentComponent } from 'my-react';
import { useAuth } from '@hook/useAuth';

interface HybridLayoutProps {
    children?: Element;
}

export function HybridLayout({ children }: HybridLayoutProps) {
    const { loading } = useAuth();

    if (loading) {
        return (
            <div className="flex size-full items-center justify-center">
                <div className="size-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            </div>
        );
    }

    // Pas de redirection : on laisse passer authentifié ou non
    return <FragmentComponent>{children}</FragmentComponent>;
}
```

### 6.2 Hook `useGuestSession`

**Fichier à créer :** `apps/frontend/src/hook/useGuestSession.ts`

Gestion de l'identité invité persistée en localStorage.

```typescript
import { useState, useCallback } from 'my-react';

const GUEST_ID_KEY = 'tournament_guest_id';
const GUEST_ALIAS_KEY = 'tournament_guest_alias';

interface GuestSession {
    guestId: string | null;
    alias: string | null;
}

export function useGuestSession() {
    const [session, setSession] = useState<GuestSession>(() => ({
        guestId: localStorage.getItem(GUEST_ID_KEY),
        alias: localStorage.getItem(GUEST_ALIAS_KEY),
    }));

    const setGuestInfo = useCallback((guestId: string, alias: string) => {
        localStorage.setItem(GUEST_ID_KEY, guestId);
        localStorage.setItem(GUEST_ALIAS_KEY, alias);
        setSession({ guestId, alias });
    }, []);

    const clearGuestSession = useCallback(() => {
        localStorage.removeItem(GUEST_ID_KEY);
        localStorage.removeItem(GUEST_ALIAS_KEY);
        setSession({ guestId: null, alias: null });
    }, []);

    const updateAlias = useCallback((alias: string) => {
        localStorage.setItem(GUEST_ALIAS_KEY, alias);
        setSession(prev => ({ ...prev, alias }));
    }, []);

    return {
        ...session,
        isGuest: !!session.guestId && !session.alias,
        setGuestInfo,
        updateAlias,
        clearGuestSession,
    };
}
```

### 6.3 Composant `GuestAliasModal`

**Fichier à créer :** `apps/frontend/src/components/tournament/GuestAliasModal.tsx`

Modal de saisie de l'alias pour les invités.

```tsx
import { createElement, useState } from 'my-react';

interface GuestAliasModalProps {
    isOpen: boolean;
    onSubmit: (alias: string) => void;
    onCancel: () => void;
    error?: string;
}

export function GuestAliasModal({ isOpen, onSubmit, onCancel, error }: GuestAliasModalProps) {
    const [alias, setAlias] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: Event) => {
        e.preventDefault();
        if (alias.trim()) {
            onSubmit(alias.trim());
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="w-full max-w-md rounded-lg border border-cyan-500/30 bg-gray-900 p-6">
                <h2 className="font-orbitron mb-4 text-xl text-cyan-400">
                    Rejoindre en tant qu'invité
                </h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={alias}
                        onChange={(e) => setAlias(e.target.value)}
                        placeholder="Votre pseudo..."
                        className="mb-4 w-full rounded border border-gray-600 bg-gray-800 px-4 py-2 text-white"
                        maxLength={20}
                        minLength={2}
                    />
                    {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 rounded border border-gray-600 px-4 py-2 text-gray-400 hover:bg-gray-800"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="flex-1 rounded bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-500"
                        >
                            Rejoindre
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
```

### 6.4 Mise à jour du Router

**Fichier à modifier :** `apps/frontend/src/router.tsx`

Ajouter les routes tournoi avec le `HybridLayout`.

```typescript
import { HybridLayout } from './layout/HybridLayout';

// Dans la configuration des routes, ajouter :
{
    // Routes hybrides (auth ou invité)
    path: '/tournament',
    layout: HybridLayout,
    routes: [
        { path: '/', component: TournamentListPage },
        { path: '/:id', component: TournamentLobbyPage },
        { path: '/:id/bracket', component: TournamentBracketPage },
    ],
},
```

---

## 7. Résumé des Fichiers à Créer/Modifier

### Nouveaux Fichiers (8)

| Chemin | Description |
|--------|-------------|
| `apps/auth/src/auth/guards/optional-auth.guard.ts` | Guard permissif pour authentification optionnelle |
| `apps/tournament/src/participant/participant.service.ts` | Service de gestion des participants |
| `apps/tournament/src/tournament/tournament.gateway.ts` | Gateway WebSocket avec identification hybride |
| `apps/frontend/src/layout/HybridLayout.tsx` | Layout sans redirection forcée |
| `apps/frontend/src/hook/useGuestSession.ts` | Hook de gestion session invité |
| `apps/frontend/src/hook/useGameSocket.ts` | Hook connexion Game avec support invité |
| `apps/frontend/src/components/tournament/GuestAliasModal.tsx` | Modal saisie alias |
| `apps/tournament/docs/07_hybrid_auth_strategy.md` | Ce document |

### Fichiers à Modifier (8)

| Chemin | Modification |
|--------|--------------|
| `apps/auth/src/auth/guards/index.ts` | Exporter `OptionalAuthGuard` |
| `apps/tournament/src/tournament/tournament.controller.ts` | Utiliser `OptionalAuthGuard` et `ParticipantService` |
| `apps/tournament/src/app.module.ts` | Enregistrer les nouveaux services |
| `apps/frontend/src/router.tsx` | Ajouter routes avec `HybridLayout` |
| `apps/game/src/game/types.ts` | Ajouter `PlayerIdentity` et `GuestAuth` |
| `apps/game/src/game/game.gateway.ts` | Authentification hybride JWT/guest |
| `apps/game/src/game/game.service.ts` | Recevoir `playerId` en paramètre explicite |
| `apps/game/src/game/pong/Game/Pong.ts` | Adapter gestion des joueurs si nécessaire |

---

## 8. Flux d'Utilisation

### 8.1 Scénario Utilisateur Authentifié

```
1. User connecté → Accède à /tournament/:id
2. Frontend détecte isAuthenticated=true
3. Connexion WebSocket avec JWT dans cookies
4. Backend extrait user via JWTBody
5. Participant créé avec type='registered'
6. Participation au tournoi avec stats historisées
```

### 8.2 Scénario Utilisateur Invité

```
1. Visiteur → Accède à /tournament/:id
2. Frontend détecte isAuthenticated=false
3. Affichage de GuestAliasModal
4. Saisie de l'alias → Stockage en localStorage
5. Connexion WebSocket avec { alias, guestId } dans handshake.auth
6. Backend génère/récupère guestId
7. Participant créé avec type='guest'
8. Participation au tournoi (pas d'historique persisté)
```

### 8.3 Scénario Match de Tournoi (Invité vs Authentifié)

Ce flux illustre le cas le plus complexe : un match entre un joueur invité et un joueur authentifié.

```
1. Tournament Service détecte que 2 participants sont prêts pour un match
   - Participant A : { id: "42", type: "registered" }
   - Participant B : { id: "550e8400-e29b-41d4-...", type: "guest" }

2. Tournament Service appelle Game Service :
   POST /games { gameId: "tournament-match-xyz", player1Id: "42", player2Id: "550e8400-..." }

3. Game Service crée l'instance de jeu et enregistre les deux player IDs

4. Tournament Service notifie les participants via WebSocket :
   → Participant A reçoit : { event: "match_ready", gameId: "tournament-match-xyz" }
   → Participant B reçoit : { event: "match_ready", gameId: "tournament-match-xyz" }

5. Les deux frontends redirigent vers /game/:gameId

6. Connexion au Game Gateway :
   - Participant A : handshake avec JWT (extrait user.id = 42)
   - Participant B : handshake avec { guestId: "550e8400-...", alias: "PlayerB" }

7. Game Gateway identifie les deux joueurs :
   - A → PlayerIdentity { id: "42", type: "registered" }
   - B → PlayerIdentity { id: "550e8400-...", type: "guest" }

8. Les deux joueurs sont connectés à la même instance Pong

9. Match se déroule normalement

10. À la fin du match :
    - Game Service notifie le résultat
    - Tournament Service met à jour le bracket
    - Stats enregistrées pour A (registered), pas pour B (guest)
```

---

## 9. Considérations de Sécurité

### 9.1 Validation des Alias Invités

- Longueur : 2-20 caractères
- Caractères autorisés : `[a-zA-Z0-9_-]`
- Vérification de doublons dans le même tournoi
- Filtrage des mots interdits (optionnel)

### 9.2 Limites Anti-Abus

- Rate limiting sur les connexions WebSocket par IP
- Expiration des sessions invité après X heures d'inactivité
- Maximum de tournois simultanés par session invité

### 9.3 Isolation des Modes

- Les stats des invités ne sont **jamais** rattachées à un compte utilisateur
- Un utilisateur authentifié ne peut pas "usurper" un alias invité existant dans un tournoi
- Le `guestId` est un UUID v4 non prédictible

---

## 10. Tests à Implémenter

### 10.1 Tests Unitaires

- `OptionalAuthGuard` : avec token valide, invalide, et absent
- `ParticipantService.createParticipant` : modes authentifié et invité
- `ParticipantService.validateGuestAlias` : cas valides et invalides

### 10.2 Tests d'Intégration

- Rejoindre un tournoi en tant qu'authentifié
- Rejoindre un tournoi en tant qu'invité
- Reconnexion WebSocket avec le même `guestId`
- Mixité des participants (auth + invités) dans le même tournoi

### 10.3 Tests Game Service (Nouveaux)

- `GameGateway` : connexion avec JWT valide
- `GameGateway` : connexion avec credentials invité valides
- `GameGateway` : rejet si ni JWT ni credentials invité
- `GameService.createGame` : création avec player IDs de type UUID
- Match complet entre un utilisateur authentifié et un invité
- Reconnexion invité pendant une partie en cours

---

## 11. Migration et Rétrocompatibilité

Cette stratégie est **100% rétrocompatible** :

- L'`AuthGuard` existant n'est pas modifié
- Les routes existantes utilisant `AuthGuard` continuent de fonctionner
- Seules les nouvelles routes du Tournament utilisent `OptionalAuthGuard`
- Le schéma de base de données `participants` supporte déjà `user_id` nullable
