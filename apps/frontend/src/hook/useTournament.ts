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
import { useTournamentUpdates, TournamentFinishedEvent } from '@hook/useTournamentUpdates';
import { TournamentResponse, TournamentStatus } from '@/components/tournament/types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface UseTournamentReturn {
    // Tournament state
    tournament: TournamentResponse | null;
    isLoading: boolean;
    loadError: string | null;
    winnerId: string | null;

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
    const [winnerId, setWinnerId] = useState<string | null>(null);

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
    const listeningToIdRef = useRef<string | null>(null);

    // -------------------------------------------------------------------------
    // Tournament Loading
    // -------------------------------------------------------------------------

    const loadTournament = useCallback(async (id: string) => {
        setIsLoading(true);
        setLoadError(null);
        // Don't clear tournament state - keep existing data while fetching
        // This prevents race conditions with match_started socket events

        const result = await fetchJsonWithAuth<TournamentResponse>(`/api/tournament/${id}`);

        if (!result.ok || !result.data) {
            const message = result.error || 'Unable to load tournament';
            setLoadError(message);
            toastRef.current(message, 'error');
            setIsLoading(false);
            return;
        }

        setTournament(result.data);

        // If tournament is finished, extract winnerId from final match
        // This handles the case where finalists return from game after TournamentFinished event
        if (result.data.status === 'FINISHED' && result.data.matches) {
            const maxRound = Math.max(...result.data.matches.map(m => m.round));
            const finalMatch = result.data.matches.find(m => m.round === maxRound);
            if (finalMatch?.winner?.id) {
                setWinnerId(finalMatch.winner.id);
            }
        }

        setIsLoading(false);
    }, []);

    // -------------------------------------------------------------------------
    // Listen to tournament (subscribe to socket events)
    // -------------------------------------------------------------------------

    const listenToTournament = useCallback((id: string) => {
        if (listeningToIdRef.current === id) {
            return;
        }

        listeningToIdRef.current = id;
        setListeningToId(id);

        if (tournamentSocket.connected) {
            tournamentSocket.emit('listen_tournament', {
                tournamentId: id
            });
        }
    }, []);

    // -------------------------------------------------------------------------
    // Socket Event Subscription (via centralized hook)
    // -------------------------------------------------------------------------

    useEffect(() => {
        if (!listeningToId) return;

        const unsubscribe = subscribeToTournament(listeningToId, {
            onPlayerJoined: (data) => {
                const playerId = data.playerId || data.participantId;
                if (!playerId) return;

                const currentTournament = tournamentRef.current;

                if (currentTournament?.participants.some(p => p.id === playerId)) {
                    return;
                }

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
            },
            onPlayerLeft: (data) => {
                const currentUser = userRef.current;

                const playerId = data.playerId;
                if (currentUser && String(currentUser.id) === playerId) {
                    navigateRef.current('/play');
                    // navigateRef.current('/play');
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

                if (currentTournament?.status === 'STARTED') return;

                loadTournament(listeningToId);
                toastRef.current('Tournament started!', 'success');
            },
            onMatchFinished: () => {
                if (listeningToId) loadTournament(listeningToId);
            },
            onMatchStarted: (data) => {
                const currentUser = userRef.current;
                if (currentUser) {
                    const userId = String(currentUser.id);
                    if (data.payload.player1Id === userId || data.payload.player2Id === userId) {
                        const currentTournament = tournamentRef.current;
                        // Use current tournament data if available, or fall back to listeningToId
                        const tournamentId = currentTournament?.id || listeningToId;
                        if (tournamentId) {
                            const tournamentType = currentTournament?.visibility?.toLowerCase() || 'private';
                            const playersCount = currentTournament?.size || 8;
                            navigateRef.current(`/game/?id=${data.payload.gameId}&type=tournament&tournamentId=${tournamentId}&tournamentType=${tournamentType}&playersCount=${playersCount}`);
                            return; // Don't refetch if redirecting
                        }
                    }
                }
                if (listeningToId) loadTournament(listeningToId);
            },
            onBracketUpdated: () => {
                if (listeningToId) loadTournament(listeningToId);
            },
            onTournamentFinished: (data: TournamentFinishedEvent) => {
                setWinnerId(data.winnerId);
                setTournament(prev => prev ? ({ ...prev, status: 'FINISHED' as TournamentStatus }) : null);
            }
        });

        return unsubscribe;
    }, [listeningToId, subscribeToTournament]);

    // Handle socket reconnection
    useEffect(() => {
        const onConnect = () => {
            if (listeningToId) {
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
            const currentTournament = tournamentRef.current;
            const currentListeningId = listeningToId;

            const eventTournamentId = data.aggregateId || data.tournamentId;
            if (!currentListeningId || eventTournamentId !== currentListeningId) {
                return;
            }

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
            //.error('Failed to leave tournament', error);
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
        winnerId,

        // Actions
        loadTournament,
        cancelTournament,
        leaveTournament,
        listenToTournament,
    };
}
