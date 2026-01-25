// =============================================================================
// useTournament Hook
// =============================================================================
//
// This hook manages tournament state and provides actions for tournament
// interactions. It uses useTournamentUpdates internally for socket handling.
//
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'my-react';
import { useNavigate } from 'my-react-router';
import { tournamentSocket } from '@libs/socket';
import { fetchJsonWithAuth } from '@libs/fetchWithAuth';
import { useToast } from '@hook/useToast';
import { useAuth } from '@hook/useAuth';
import { useTournamentUpdates } from '@hook/useTournamentUpdates';
import { TournamentResponse, TournamentStatus } from '@/components/tournament/types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface UseTournamentReturn {
    // Tournament state
    tournament: TournamentResponse | null;
    isLoading: boolean;
    loadError: string | null;

    // Modal state for cancelled tournament
    showCancelModal: boolean;
    setShowCancelModal: (show: boolean) => void;

    // Actions
    loadTournament: (id: string) => Promise<void>;
    cancelTournament: () => Promise<void>;
    leaveTournament: () => Promise<void>;
    listenToTournament: (id: string) => void;
}

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

export function useTournament(): UseTournamentReturn {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth();
    const { subscribeToTournament } = useTournamentUpdates();

    // Tournament state
    const [tournament, setTournament] = useState<TournamentResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showCancelModal, setShowCancelModal] = useState(false);

    // Refs to avoid stale closures
    const tournamentRef = useRef<TournamentResponse | null>(null);
    const toastRef = useRef(toast);
    const userRef = useRef(user);
    const navigateRef = useRef(navigate);

    // Keep refs in sync with latest values
    useEffect(() => {
        tournamentRef.current = tournament;
    }, [tournament]);

    useEffect(() => {
        toastRef.current = toast;
    }, [toast]);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        navigateRef.current = navigate;
    }, [navigate]);

    // Track which tournament we're currently listening to (as state to trigger effects)
    const [listeningToId, setListeningToId] = useState<string | null>(null);

    // -------------------------------------------------------------------------
    // Tournament Loading
    // -------------------------------------------------------------------------

    const loadTournament = useCallback(async (id: string) => {
        setIsLoading(true);
        setLoadError(null);
        setTournament(null);

        const result = await fetchJsonWithAuth<TournamentResponse>(`/api/tournament/${id}`);

        if (!result.ok || !result.data) {
            const message = result.error || 'Unable to load tournament';
            setLoadError(message);
            toastRef.current(message, 'error');
            setIsLoading(false);
            return;
        }

        setTournament(result.data);
        setIsLoading(false);
    }, []);

    // -------------------------------------------------------------------------
    // Listen to tournament (subscribe to socket events)
    // -------------------------------------------------------------------------

    const listenToTournament = useCallback((id: string) => {
        if (listeningToId === id) {
            console.log('[useTournament] Already listening to tournament:', id);
            return;
        }

        console.log('[useTournament] Starting to listen to tournament:', id);
        setListeningToId(id);

        if (tournamentSocket.connected) {
            console.log('[useTournament] Emitting listen_tournament');
            tournamentSocket.emit('listen_tournament', {
                tournamentId: id,
                displayName: 'Guest'
            });
        }
    }, [listeningToId]);

    // -------------------------------------------------------------------------
    // Socket Event Subscription (via centralized hook)
    // -------------------------------------------------------------------------

    useEffect(() => {
        if (!listeningToId) return;

        console.log('[useTournament] Subscribing to tournament updates:', listeningToId);

        const unsubscribe = subscribeToTournament(listeningToId, {
            onPlayerJoined: (data) => {
                const playerId = data.playerId || data.participantId;
                if (!playerId) return;

                const currentTournament = tournamentRef.current;

                // Check if player already exists
                if (currentTournament?.participants.some(p => p.id === playerId)) {
                    console.log('[useTournament] Player already in tournament, ignoring:', playerId);
                    return;
                }

                console.log('[useTournament] Processing join for player:', playerId);
                setTournament((prev) => {
                    if (!prev) return null;
                    if (prev.participants.some(p => p.id === playerId)) return prev;

                    return {
                        ...prev,
                        participants: [
                            ...prev.participants,
                            {
                                id: playerId,
                                displayName: data.displayName,
                                type: 'USER'
                            }
                        ]
                    };
                });

                toastRef.current(`Player ${data.displayName} joined!`, 'info');
            },
            onPlayerLeft: (data) => {
                console.log('[useTournament] PlayerLeft event:', data);
                const currentUser = userRef.current;

                const playerId = data.playerId;
                if (currentUser && String(currentUser.id) === playerId) {
                    // Current user left (e.g. from another tab), redirect
                    navigateRef.current('/play');
                    return;
                }

                setTournament((prev) => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        participants: prev.participants.filter(p => p.id !== playerId)
                    };
                });
            },
            onTournamentStarted: () => {
                const currentTournament = tournamentRef.current;

                // Avoid duplicate updates
                if (currentTournament?.status === 'STARTED') return;

                setTournament(prev => prev ? ({ ...prev, status: 'STARTED' as TournamentStatus }) : null);
                toastRef.current('Tournament started!', 'success');
            }
        });

        return unsubscribe;
    }, [listeningToId, subscribeToTournament]);

    // Handle socket reconnection
    useEffect(() => {
        const onConnect = () => {
            console.log('[useTournament] Socket connected:', tournamentSocket.id);
            if (listeningToId) {
                console.log('[useTournament] Re-subscribing to tournament after connect:', listeningToId);
                tournamentSocket.emit('listen_tournament', {
                    tournamentId: listeningToId,
                    displayName: 'Guest'
                });
            }
        };

        tournamentSocket.on('connect', onConnect);

        return () => {
            tournamentSocket.off('connect', onConnect);
        };
    }, [listeningToId]);

    // Handle TournamentCancelled separately (not in useTournamentUpdates yet)
    useEffect(() => {
        const onTournamentCancelled = (data: { aggregateId?: string; tournamentId?: string }) => {
            console.log('[useTournament] TournamentCancelled event:', data);
            const currentTournament = tournamentRef.current;
            const currentListeningId = listeningToId;

            const eventTournamentId = data.aggregateId || data.tournamentId;
            if (!currentListeningId || eventTournamentId !== currentListeningId) {
                return;
            }

            // Avoid duplicate updates
            if (currentTournament?.status === 'CANCELED') return;

            setTournament(prev => prev ? ({ ...prev, status: 'CANCELED' as TournamentStatus }) : null);
            setShowCancelModal(true);
        };

        tournamentSocket.on('TournamentCancelled', onTournamentCancelled);

        return () => {
            tournamentSocket.off('TournamentCancelled', onTournamentCancelled);
        };
    }, [listeningToId]);

    // -------------------------------------------------------------------------
    // Action Handlers
    // -------------------------------------------------------------------------

    const cancelTournament = useCallback(async () => {
        const currentTournament = tournamentRef.current;
        if (!currentTournament?.id) return;

        try {
            const result = await fetchJsonWithAuth(`/api/tournament/${currentTournament.id}`, {
                method: 'DELETE',
                body: JSON.stringify({}),
            });

            if (result.ok) {
                toastRef.current('Tournament canceled', 'success');
                setTournament(null);
                setListeningToId(null);
                navigateRef.current('/play');
            } else {
                toastRef.current(result.error || 'Failed to cancel tournament', 'error');
            }
        } catch (error) {
            console.error('Failed to cancel tournament', error);
            toastRef.current('An error occurred', 'error');
        }
    }, []);

    const leaveTournament = useCallback(async () => {
        const currentTournament = tournamentRef.current;
        if (!currentTournament?.id) return;

        try {
            const result = await fetchJsonWithAuth(`/api/tournament/${currentTournament.id}/leave`, {
                method: 'POST',
                body: JSON.stringify({}),
            });

            if (result.ok) {
                toastRef.current('You left the tournament', 'success');
                setTournament(null);
                setListeningToId(null);
                navigateRef.current('/play');
            } else {
                toastRef.current(result.error || 'Failed to leave tournament', 'error');
            }
        } catch (error) {
            console.error('Failed to leave tournament', error);
            toastRef.current('An error occurred', 'error');
        }
    }, []);

    // -------------------------------------------------------------------------
    // Return Value
    // -------------------------------------------------------------------------

    return {
        // State
        tournament,
        isLoading,
        loadError,
        showCancelModal,
        setShowCancelModal,

        // Actions
        loadTournament,
        cancelTournament,
        leaveTournament,
        listenToTournament,
    };
}
