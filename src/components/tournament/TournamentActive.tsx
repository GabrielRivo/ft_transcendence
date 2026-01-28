import { createElement } from 'my-react';
import { CardStyle2 } from '@/components/ui/card/style2';
import { TournamentResponse } from './types';
import { TournamentBracket } from './TournamentBracket';
import { TournamentTimer } from './TournamentTimer';
import { useTournamentUpdates, MatchScoreUpdatedEvent } from '@/hook/useTournamentUpdates';
import { useEffect, useState } from 'my-react';


interface TournamentActiveProps {
    tournament: TournamentResponse;
}

export function TournamentActive({ tournament }: TournamentActiveProps) {
    const { subscribeToTournament } = useTournamentUpdates();
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [liveScores, setLiveScores] = useState<Record<string, { scoreA: number; scoreB: number }>>({});

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
            onBracketUpdated: () => {
                // console.log('Bracket updated event received in ActiveTournament');
            }
        });
    }, [tournament.id, subscribeToTournament]);

    return (
        <CardStyle2 className="flex h-full w-full max-w-5xl flex-col overflow-hidden">
            {/* Timer Section (Absolute Top-Left) */}
            {timeLeft > 0 && (
                <div className="absolute left-4 top-4 z-20">
                    <TournamentTimer timeLeft={timeLeft} />
                </div>
            )}
            {/* Header */}
            <div className="flex flex-col items-center pb-4">
                <h3 className="font-pirulen text-xl tracking-widest text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                    {tournament.name}
                </h3>
            </div>

            {/* Bracket Section - Full Flex Area */}
            <div className="flex flex-1 items-center justify-center overflow-auto p-4">
                <div className="h-full w-full min-w-[600px]">
                    <TournamentBracket tournament={tournament} liveScores={liveScores} />
                </div>
            </div>
        </CardStyle2>
    );
}

