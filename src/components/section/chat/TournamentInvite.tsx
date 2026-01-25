import { createElement, useEffect, useState } from 'my-react';
import { fetchJsonWithAuth } from '../../../libs/fetchWithAuth';
import { tournamentSocket } from '../../../libs/socket';
import { useTournamentUpdates } from '../../../hook/useTournamentUpdates';
import { ButtonProgress } from '@/components/ui/button/buttonProgress';

interface TournamentInviteProps {
    tournamentId: string;
    onJoin: (id: string) => void;
}

interface TournamentDetails {
    id: string;
    name: string;
    size: number;
    status: string;
    participants: any[];
}

export function TournamentInvite({ tournamentId, onJoin }: TournamentInviteProps) {
    const [tournament, setTournament] = useState<TournamentDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const { subscribeToTournament } = useTournamentUpdates();

    // Fetch tournament details on mount
    useEffect(() => {
        let isMounted = true;

        // Ensure socket is connected
        if (!tournamentSocket.connected) {
            console.log('[TournamentInvite] Connecting tournament socket...');
            tournamentSocket.connect();
        }

        const fetchTournament = async () => {
            try {
                const result = await fetchJsonWithAuth<TournamentDetails>(`/api/tournament/${tournamentId}`);
                if (isMounted) {
                    if (result.ok && result.data) {
                        setTournament(result.data);
                        // Join lobby only after we know the tournament exists
                        tournamentSocket.emit('listen_lobby');
                    } else {
                        setError(true);
                    }
                    setLoading(false);
                }
            } catch (e) {
                if (isMounted) {
                    console.error('Failed to fetch tournament invite details:', e);
                    setError(true);
                    setLoading(false);
                }
            }
        };

        fetchTournament();

        return () => {
            isMounted = false;
        };
    }, [tournamentId]);

    // Subscribe to tournament updates via centralized hook
    useEffect(() => {
        const unsubscribe = subscribeToTournament(tournamentId, {
            onPlayerJoined: (data) => {
                const playerId = data.playerId || data.participantId;
                if (!playerId) return;

                setTournament((prev) => {
                    if (!prev) return null;
                    // Avoid duplicates
                    if (prev.participants.some((p) => p.id === playerId)) return prev;

                    console.log(`[TournamentInvite] Updating participants for tournament ${tournamentId}`);
                    return {
                        ...prev,
                        participants: [...prev.participants, { id: playerId }]
                    };
                });
            },
            onPlayerLeft: (data) => {
                setTournament((prev) => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        participants: prev.participants.filter(p => p.id !== data.playerId)
                    };
                });
            },
            onTournamentStarted: () => {
                setTournament((prev) => prev ? ({ ...prev, status: 'STARTED' }) : null);
            }
        });

        return unsubscribe;
    }, [tournamentId, subscribeToTournament]);

    if (loading) return <span className="text-xs text-gray-500 animate-pulse">Loading invite...</span>;
    if (error || !tournament) return <span className="text-xs text-red-500">Tournament expired or invalid</span>;

    const currentCount = tournament.participants.length;
    const maxCount = tournament.size;
    const isFull = currentCount >= maxCount;
    const isJoinable = tournament.status === 'CREATED' && !isFull;

    return (
        <ButtonProgress
            max={tournament.size}
            current={tournament.participants.length}
            onClick={(e: any) => {
                e.stopPropagation();
                if (isJoinable) onJoin(tournamentId);
            }}
            className={`bg-purple-500`}
        >
            <span className="relative z-10 flex items-center justify-center">
                {isFull ? 'FULL' : tournament.status === 'STARTED' ? 'STARTED' : (
                    <span className="flex items-center gap-2">
                        <span>JOIN {tournament.name}</span>
                        <span className="text-[10px] opacity-70">({currentCount}/{maxCount})</span>
                    </span>
                )}
            </span>
        </ButtonProgress>
    );
}
