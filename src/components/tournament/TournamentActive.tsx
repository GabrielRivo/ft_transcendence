import { createElement } from 'my-react';
import { CardStyle2 } from '@/components/ui/card/style2';
import { TournamentResponse } from './types';
import { TournamentBracket } from './TournamentBracket';
import { TournamentTimer } from './TournamentTimer';
import { useTournamentUpdates, MatchScoreUpdatedEvent } from '@/hook/useTournamentUpdates';
import { useNavigate } from 'my-react-router';
import { useEffect, useState, useMemo } from 'my-react';
import { useAuth } from '@/hook/useAuth';

interface TournamentActiveProps {
    tournament: TournamentResponse;
}

export function TournamentActive({ tournament }: TournamentActiveProps) {
    const { subscribeToTournament } = useTournamentUpdates();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [liveScores, setLiveScores] = useState<Record<string, { scoreA: number; scoreB: number }>>({});

    const userId = user?.id ? String(user.id) : null;
    const stableUserId = useMemo(() => userId, [userId]);

    useEffect(() => {
        return subscribeToTournament(tournament.id, {
            onTimerUpdate: (data) => {
                setTimeLeft(data.timeRemaining);
            },
            onMatchScoreUpdated: (data: MatchScoreUpdatedEvent) => {
                setLiveScores(prev => ({
                    ...prev,
                    [data.payload.matchId]: {
                        scoreA: data.payload.scoreA,
                        scoreB: data.payload.scoreB
                    }
                }));
            },
            onMatchStarted: (data) => {
                if (data.payload.player1Id === stableUserId || data.payload.player2Id === stableUserId) {
                    const tournamentType = tournament.visibility.toLowerCase();
                    const playersCount = tournament.size;
                    navigate(`/game/?id=${data.payload.gameId}&type=tournament&tournamentId=${tournament.id}&tournamentType=${tournamentType}&playersCount=${playersCount}`);
                }
            },
            onBracketUpdated: () => {
                // Handled by useTournament hook refetching, but we can also do local state updates if needed
                console.log('Bracket updated event received in ActiveTournament');
            }
        });
    }, [tournament.id, subscribeToTournament, stableUserId]); // Removed navigate as it might be unstable

    return (
        <CardStyle2 className="w-full max-w-3xl">
            <div className="flex w-full flex-col gap-8">
                <div className="text-center">
                    <h3 className="font-pirulen text-xl tracking-widest text-white">Tournament Active</h3>
                    <p className="mt-2 text-sm text-gray-400">{tournament.name}</p>
                </div>

                {timeLeft > 0 && (
                    <div className="flex justify-center">
                        <TournamentTimer timeLeft={timeLeft} />
                    </div>
                )}

                <div className="rounded-sm border border-white/10 bg-white/5 p-8 text-center overflow-x-auto">
                    <TournamentBracket tournament={tournament} liveScores={liveScores} />
                </div>
            </div>
        </CardStyle2>
    );
}
