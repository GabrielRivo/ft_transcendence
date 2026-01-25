import { createElement } from 'my-react';

interface TournamentTimerProps {
    timeLeft: number;
}

export function TournamentTimer({ timeLeft }: TournamentTimerProps) {
    if (timeLeft <= 0) return null;

    return (
        <div className="flex flex-col items-center justify-center p-4 rounded bg-black/30 border border-neon-pink/30 shadow-[0_0_15px_rgba(255,0,128,0.3)]">
            <div className="font-pirulen text-xs text-neon-pink mb-2">Next Round Starts In</div>
            <div className="font-pirulen text-4xl text-neon-pink animate-pulse">{timeLeft}</div>
        </div>
    );
}
