// =============================================================================
// useTournamentUpdates Hook
// =============================================================================
//
// A centralized hook for receiving tournament updates via WebSocket.
// This hook manages a single set of socket listeners and provides
// subscription callbacks for components that need to react to tournament events.
//
// Usage:
//   const { subscribeToTournament } = useTournamentUpdates();
//   
//   useEffect(() => {
//     return subscribeToTournament(tournamentId, {
//       onPlayerJoined: (data) => { ... },
//       onPlayerLeft: (data) => { ... },
//     });
//   }, [tournamentId]);
//
// =============================================================================

import { useEffect, useRef, useCallback } from 'my-react';
import { tournamentSocket } from '@libs/socket';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface PlayerJoinedEvent {
    aggregateId?: string;
    tournamentId?: string;
    playerId?: string;
    participantId?: string;
    displayName: string;
    occurredAt?: string;
}

interface PlayerLeftEvent {
    aggregateId?: string;
    tournamentId?: string;
    playerId: string;
    occurredAt?: string;
}

interface TournamentStartedEvent {
    aggregateId?: string;
    tournamentId?: string;
    occurredAt?: string;
}

interface TournamentSubscription {
    onPlayerJoined?: (data: PlayerJoinedEvent) => void;
    onPlayerLeft?: (data: PlayerLeftEvent) => void;
    onTournamentStarted?: (data: TournamentStartedEvent) => void;
}

// -----------------------------------------------------------------------------
// Global State (singleton pattern)
// -----------------------------------------------------------------------------

// Global map of tournament subscriptions: tournamentId -> Set of subscribers
const tournamentSubscribers = new Map<string, Set<TournamentSubscription>>();

// Track if global handlers are registered
let globalHandlersRegistered = false;

// Processed events for deduplication
const processedEvents = new Set<string>();

// Clean up processed events after 10 seconds
const cleanupEvent = (eventKey: string) => {
    setTimeout(() => {
        processedEvents.delete(eventKey);
    }, 10000);
};

// Event handlers
const handlePlayerJoined = (data: PlayerJoinedEvent) => {
    const tournamentId = data.aggregateId || data.tournamentId;
    if (!tournamentId) return;

    const playerId = data.playerId || data.participantId;
    const eventKey = `join-${playerId}-${data.occurredAt || Date.now()}`;

    if (processedEvents.has(eventKey)) {
        return;
    }
    processedEvents.add(eventKey);
    cleanupEvent(eventKey);

    console.log('[TournamentUpdates] PlayerJoined:', tournamentId, playerId);

    const subscribers = tournamentSubscribers.get(tournamentId);
    if (subscribers) {
        subscribers.forEach(sub => {
            if (sub.onPlayerJoined) {
                sub.onPlayerJoined(data);
            }
        });
    }
};

const handlePlayerLeft = (data: PlayerLeftEvent) => {
    const tournamentId = data.aggregateId || data.tournamentId;
    if (!tournamentId) return;

    const eventKey = `left-${data.playerId}-${data.occurredAt || Date.now()}`;

    if (processedEvents.has(eventKey)) {
        return;
    }
    processedEvents.add(eventKey);
    cleanupEvent(eventKey);

    console.log('[TournamentUpdates] PlayerLeft:', tournamentId, data.playerId);

    const subscribers = tournamentSubscribers.get(tournamentId);
    if (subscribers) {
        subscribers.forEach(sub => {
            if (sub.onPlayerLeft) {
                sub.onPlayerLeft(data);
            }
        });
    }
};

const handleTournamentStarted = (data: TournamentStartedEvent) => {
    const tournamentId = data.aggregateId || data.tournamentId;
    if (!tournamentId) return;

    const eventKey = `started-${tournamentId}-${data.occurredAt || Date.now()}`;

    if (processedEvents.has(eventKey)) {
        return;
    }
    processedEvents.add(eventKey);
    cleanupEvent(eventKey);

    console.log('[TournamentUpdates] TournamentStarted:', tournamentId);

    const subscribers = tournamentSubscribers.get(tournamentId);
    if (subscribers) {
        subscribers.forEach(sub => {
            if (sub.onTournamentStarted) {
                sub.onTournamentStarted(data);
            }
        });
    }
};

const registerGlobalHandlers = () => {
    if (globalHandlersRegistered) return;
    globalHandlersRegistered = true;

    console.log('[TournamentUpdates] Registering global socket handlers');

    tournamentSocket.on('PlayerJoined', handlePlayerJoined);
    tournamentSocket.on('PlayerLeft', handlePlayerLeft);
    tournamentSocket.on('TournamentStarted', handleTournamentStarted);
    // Legacy snake_case events
    tournamentSocket.on('player_joined', handlePlayerJoined);
    tournamentSocket.on('player_left', handlePlayerLeft);
    tournamentSocket.on('tournament_started', handleTournamentStarted);
};

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

export function useTournamentUpdates() {
    const isFirstMount = useRef(true);

    // Register global handlers on first mount
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            registerGlobalHandlers();
        }
    }, []);

    const subscribeToTournament = useCallback((
        tournamentId: string,
        subscription: TournamentSubscription
    ): (() => void) => {
        if (!tournamentSubscribers.has(tournamentId)) {
            tournamentSubscribers.set(tournamentId, new Set());
        }

        const subscribers = tournamentSubscribers.get(tournamentId)!;
        subscribers.add(subscription);

        console.log('[TournamentUpdates] Subscribed to tournament:', tournamentId, 'Total subscribers:', subscribers.size);

        // Return unsubscribe function
        return () => {
            subscribers.delete(subscription);
            console.log('[TournamentUpdates] Unsubscribed from tournament:', tournamentId, 'Remaining:', subscribers.size);

            if (subscribers.size === 0) {
                tournamentSubscribers.delete(tournamentId);
            }
        };
    }, []);

    return { subscribeToTournament };
}
