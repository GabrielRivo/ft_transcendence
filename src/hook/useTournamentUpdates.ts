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

export interface PlayerJoinedEvent {
    aggregateId?: string;
    tournamentId?: string;
    playerId?: string;
    participantId?: string;
    displayName: string;
    occurredAt?: string;
}

export interface PlayerLeftEvent {
    aggregateId?: string;
    tournamentId?: string;
    playerId: string;
    occurredAt?: string;
}

export interface TournamentStartedEvent {
    aggregateId?: string;
    tournamentId?: string;
    occurredAt?: string;
}

export interface MatchStartedEvent {
    aggregateId: string;
    payload: {
        matchId: string;
        gameId: string;
        player1Id: string;
        player2Id: string;
    };
    occurredAt: string;
}

export interface MatchFinishedEvent {
    aggregateId: string;
    payload: {
        matchId: string;
        winnerId: string;
    };
}

export interface MatchScoreUpdatedEvent {
    aggregateId: string;
    payload: {
        matchId: string;
        scoreA: number;
        scoreB: number;
    };
    occurredAt: string;
}

export interface TimerUpdateEvent {
    tournamentId: string;
    timeRemaining: number;
}

export interface BracketUpdatedEvent {
    aggregateId: string;
    occurredAt: string;
}

export interface TournamentFinishedEvent {
    aggregateId: string;
    winnerId: string;
    occurredAt: string;
}

export interface TournamentSubscription {
    onPlayerJoined?: (data: PlayerJoinedEvent) => void;
    onPlayerLeft?: (data: PlayerLeftEvent) => void;
    onTournamentStarted?: (data: TournamentStartedEvent) => void;
    onMatchStarted?: (data: MatchStartedEvent) => void;
    onMatchFinished?: (data: MatchFinishedEvent) => void;
    onMatchScoreUpdated?: (data: MatchScoreUpdatedEvent) => void;
    onTimerUpdate?: (data: TimerUpdateEvent) => void;
    onBracketUpdated?: (data: BracketUpdatedEvent) => void;
    onTournamentFinished?: (data: TournamentFinishedEvent) => void;
}

// -----------------------------------------------------------------------------
// Global State (singleton pattern)
// -----------------------------------------------------------------------------

// Global map of tournament subscriptions: tournamentId -> Set of subscribers
const tournamentSubscribers = new Map<string, Set<TournamentSubscription>>();

// Global map of disconnect timeouts to handle rapid unmount/remount
const tournamentDisconnectTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

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

    // console.log('[TournamentUpdates] PlayerJoined:', tournamentId, playerId);

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

    // console.log('[TournamentUpdates] PlayerLeft:', tournamentId, data.playerId);

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

   //  console.log('[TournamentUpdates] TournamentStarted:', tournamentId);

    const subscribers = tournamentSubscribers.get(tournamentId);
    if (subscribers) {
        subscribers.forEach(sub => {
            if (sub.onTournamentStarted) {
                sub.onTournamentStarted(data);
            }
        });
    }
};

const handleMatchStarted = (data: MatchStartedEvent) => {
    const tournamentId = data.aggregateId;
    if (!tournamentId) return;

    // console.log('[TournamentUpdates] MatchStarted:', tournamentId, data.payload?.matchId);

    const subscribers = tournamentSubscribers.get(tournamentId);
    if (subscribers) {
        subscribers.forEach(sub => {
            if (sub.onMatchStarted) {
                sub.onMatchStarted(data);
            }
        });
    }
};

const handleMatchFinished = (data: MatchFinishedEvent) => {
    const tournamentId = data.aggregateId;
    if (!tournamentId) return;

    // console.log('[TournamentUpdates] MatchFinished:', tournamentId, data.payload?.matchId);

    const subscribers = tournamentSubscribers.get(tournamentId);
    if (subscribers) {
        subscribers.forEach(sub => {
            if (sub.onMatchFinished) {
                sub.onMatchFinished(data);
            }
        });
    }
};

const handleMatchScoreUpdated = (data: MatchScoreUpdatedEvent) => {
    // console.log('[TournamentUpdates] Received match_score_updated raw:', data);
    const tournamentId = data.aggregateId;
    if (!tournamentId) {
        console.warn('[TournamentUpdates] No aggregateId in match_score_updated event');
        return;
    }

   //  console.log('[TournamentUpdates] MatchScoreUpdated:', tournamentId, data.payload?.matchId);

    const subscribers = tournamentSubscribers.get(tournamentId);
    if (subscribers) {
        subscribers.forEach(sub => {
            if (sub.onMatchScoreUpdated) {
                sub.onMatchScoreUpdated(data);
            }
        });
    }
};

const handleTimerUpdate = (data: TimerUpdateEvent) => {
    const tournamentId = data.tournamentId;
    if (!tournamentId) return;

    const subscribers = tournamentSubscribers.get(tournamentId);
    if (subscribers) {
        subscribers.forEach(sub => {
            if (sub.onTimerUpdate) {
                sub.onTimerUpdate(data);
            }
        });
    }
};

const handleBracketUpdated = (data: BracketUpdatedEvent) => {
    const tournamentId = data.aggregateId;
    if (!tournamentId) return;

    // console.log('[TournamentUpdates] BracketUpdated:', tournamentId);

    const subscribers = tournamentSubscribers.get(tournamentId);
    if (subscribers) {
        subscribers.forEach(sub => {
            if (sub.onBracketUpdated) {
                sub.onBracketUpdated(data);
            }
        });
    }
};

const handleTournamentFinished = (data: TournamentFinishedEvent) => {
    const tournamentId = data.aggregateId;
    if (!tournamentId) return;

    const eventKey = `finished-${tournamentId}-${data.occurredAt || Date.now()}`;

    if (processedEvents.has(eventKey)) {
        return;
    }
    processedEvents.add(eventKey);
    cleanupEvent(eventKey);

    // console.log('[TournamentUpdates] TournamentFinished:', tournamentId, 'Winner:', data.winnerId);

    const subscribers = tournamentSubscribers.get(tournamentId);
    if (subscribers) {
        subscribers.forEach(sub => {
            if (sub.onTournamentFinished) {
                sub.onTournamentFinished(data);
            }
        });
    }
};

const registerGlobalHandlers = () => {
    if (globalHandlersRegistered) return;
    globalHandlersRegistered = true;

    // console.log('[TournamentUpdates] Registering global socket handlers');

    tournamentSocket.on('PlayerJoined', handlePlayerJoined);
    tournamentSocket.on('PlayerLeft', handlePlayerLeft);
    tournamentSocket.on('TournamentStarted', handleTournamentStarted);
    // Legacy snake_case events
    tournamentSocket.on('player_joined', handlePlayerJoined);
    tournamentSocket.on('player_left', handlePlayerLeft);
    tournamentSocket.on('tournament_started', handleTournamentStarted);
    tournamentSocket.on('match_started', handleMatchStarted);
    tournamentSocket.on('match_finished', handleMatchFinished);
    tournamentSocket.on('game.finished', handleMatchFinished);
    tournamentSocket.on('match_score_updated', handleMatchScoreUpdated);
    tournamentSocket.on('match_score_updated', handleMatchScoreUpdated);
    tournamentSocket.on('timer_update', handleTimerUpdate);
    tournamentSocket.on('BracketUpdated', handleBracketUpdated);
    tournamentSocket.on('bracket_updated', handleBracketUpdated);
    tournamentSocket.on('TournamentFinished', handleTournamentFinished);
    tournamentSocket.on('tournament_finished', handleTournamentFinished);
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

        // Cancel pending disconnect if any (re-joining within the grace period)
        let wasPendingDisconnect = false;
        if (tournamentDisconnectTimeouts.has(tournamentId)) {
           //  console.log('[TournamentUpdates] Cancelling pending disconnect for:', tournamentId);
            clearTimeout(tournamentDisconnectTimeouts.get(tournamentId));
            tournamentDisconnectTimeouts.delete(tournamentId);
            wasPendingDisconnect = true;
        }

        const isFirstSubscriber = subscribers.size === 0;
        subscribers.add(subscription);

        // Emit to server to join the room only if we are the first subscriber and not just cancelling a disconnect
        if (isFirstSubscriber && !wasPendingDisconnect) {
          //   console.log('[TournamentUpdates] Emitting listen_tournament for:', tournamentId);
            tournamentSocket.emit('listen_tournament', { tournamentId });
        }

       //  console.log('[TournamentUpdates] Subscribed to tournament:', tournamentId, 'Total subscribers:', subscribers.size);

        // Return unsubscribe function
        return () => {
            subscribers.delete(subscription);
          //   console.log('[TournamentUpdates] Unsubscribed from tournament:', tournamentId, 'Remaining:', subscribers.size);

            if (subscribers.size === 0) {
                // Debounce the leave event to prevent flickering on re-renders
                if (tournamentDisconnectTimeouts.has(tournamentId)) {
                    clearTimeout(tournamentDisconnectTimeouts.get(tournamentId));
                }

                const timeout = setTimeout(() => {
                    tournamentSubscribers.delete(tournamentId);
                    tournamentDisconnectTimeouts.delete(tournamentId);
                    // Emit to server to leave the room if no more subscribers
                //     console.log('[TournamentUpdates] Emitting leave_tournament for:', tournamentId);
                    tournamentSocket.emit('leave_tournament', { tournamentId });
                }, 100); // 100ms grace period

                tournamentDisconnectTimeouts.set(tournamentId, timeout);
            }
        };
    }, []);

    return { subscribeToTournament };
}
