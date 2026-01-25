import { createElement } from 'my-react';
import { CardStyle2 } from '@/components/ui/card/style2';
import { TournamentResponse } from './types';

interface TournamentActiveProps {
    tournament: TournamentResponse;
}

export function TournamentActive({ tournament }: TournamentActiveProps) {
    return (
        <CardStyle2 className="w-full max-w-3xl">
            <div className="flex w-full flex-col gap-8">
                <div className="text-center">
                    <h3 className="font-pirulen text-xl tracking-widest text-white">Tournament Active</h3>
                    <p className="mt-2 text-sm text-gray-400">{tournament.name}</p>
                </div>

                <div className="rounded-sm border border-white/10 bg-white/5 p-8 text-center">
                    <p className="font-pirulen text-lg text-neon-blue">TOURNAMENT IN PROGRESS</p>
                    <p className="mt-4 text-sm text-gray-400">Match brackets will appear here.</p>
                </div>
            </div>
        </CardStyle2>
    );
}
