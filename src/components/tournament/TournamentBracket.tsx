import { createElement } from 'my-react';
import { Match as MatchType, TournamentResponse } from './types';

interface TournamentBracketProps {
    tournament: TournamentResponse;
    liveScores?: Record<string, { scoreA: number; scoreB: number }>;
}

export function TournamentBracket({ tournament, liveScores = {} }: TournamentBracketProps) {
    const matches = tournament.matches || [];
    if (matches.length === 0) {
        return <div className="text-gray-400">Bracket generation pending...</div>;
    }

    const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b);

    return (
        <div className="flex w-full items-center justify-center gap-8 overflow-x-auto p-4">
            {rounds.map(round => {
                const roundMatches = matches
                    .filter(m => m.round === round)
                    .sort((a, b) => a.position - b.position);

                return (
                    <div key={round} className="flex flex-col justify-around gap-8">
                        <h4 className="text-center font-pirulen text-xs text-neon-blue mb-4">Round {round}</h4>
                        <div className="flex flex-col gap-4">
                            {roundMatches.map(match => (
                                <MatchCard key={match.id} match={match} liveScore={liveScores[match.id]} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function MatchCard({ match, liveScore }: { match: MatchType; liveScore?: { scoreA: number; scoreB: number }; key?: any }) {
    const isFinished = match.status === 'FINISHED';

    // Prefer live score if available and match not finished
    const scoreA = (liveScore && !isFinished) ? liveScore.scoreA : match.scoreA;
    const scoreB = (liveScore && !isFinished) ? liveScore.scoreB : match.scoreB;

    return (
        <div className={`relative flex w-48 flex-col rounded border border-white/10 bg-black/40 p-2 ${isFinished ? 'opacity-80' : 'opacity-100'}`}>
            <div className={`mb-1 flex justify-between ${match.winner?.id === match.playerA?.id ? 'text-neon-blue font-bold' : 'text-white'}`}>
                <span>{match.playerA?.displayName || 'TBD'}</span>
                <span>{scoreA}</span>
            </div>
            <div className={`flex justify-between ${match.winner?.id === match.playerB?.id ? 'text-neon-blue font-bold' : 'text-white'}`}>
                <span>{match.playerB?.displayName || 'TBD'}</span>
                <span>{scoreB}</span>
            </div>
            <div className="absolute -right-4 top-1/2 h-[1px] w-4 bg-white/20"></div>
        </div>
    );
}
