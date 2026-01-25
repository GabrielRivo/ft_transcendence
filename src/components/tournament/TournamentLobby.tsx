import { createElement } from 'my-react';
import { ButtonStyle3 } from '@/components/ui/button/style3';
import { CardStyle2 } from '@/components/ui/card/style2';
import { TournamentResponse } from './types';

interface TournamentLobbyProps {
    tournament: TournamentResponse | null;
    tournamentName: string;
    isOwner: boolean;
    isLoading: boolean;
    loadError: string | null;
    onRetry: () => void;
    onCancel: () => void;
    onLeave: () => void;
}

export function TournamentLobby({
    tournament,
    tournamentName,
    isOwner,
    isLoading,
    loadError,
    onRetry,
    onCancel,
    onLeave,
}: TournamentLobbyProps) {
    return (
        <CardStyle2 className="w-full max-w-3xl">
            <div className="flex w-full flex-col gap-8">
                <div className="text-center">
                    <h3 className="font-pirulen text-xl tracking-widest text-white">Tournament Lobby</h3>
                    <p className="mt-2 text-sm text-gray-400">{tournament?.name || tournamentName}</p>
                </div>
                {isLoading && (
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                        <span className="font-mono text-xs tracking-widest">LOADING TOURNAMENT</span>
                    </div>
                )}
                {loadError && (
                    <div className="rounded-sm border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-300">
                        <p className="font-pirulen text-xs tracking-widest text-red-300">Unable to load tournament</p>
                        <p className="mt-2 text-xs text-gray-400">{loadError}</p>
                        <div className="mt-4 flex justify-center">
                            <ButtonStyle3 onClick={onRetry}>Retry</ButtonStyle3>
                        </div>
                    </div>
                )}
                {tournament && (
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-300">
                            <span className="rounded-sm border border-white/10 bg-white/5 px-3 py-1">ID: {tournament.id}</span>
                            <span className="rounded-sm border border-white/10 bg-white/5 px-3 py-1">
                                Visibility: {tournament.visibility === 'PUBLIC' ? 'Public' : 'Private'}
                            </span>
                            <span className="rounded-sm border border-white/10 bg-white/5 px-3 py-1">Status: {tournament.status}</span>
                            <span className="rounded-sm border border-white/10 bg-white/5 px-3 py-1">
                                Players: {tournament.participants.length}/{tournament.size}
                            </span>
                        </div>
                        <div className="rounded-sm border border-white/10 bg-white/5 p-4">
                            <h4 className="font-pirulen text-xs tracking-widest text-white">Players</h4>
                            {tournament.participants.length > 0 ? (
                                <ul className="mt-3 flex flex-col gap-2 text-sm text-gray-200">
                                    {tournament.participants.map((participant) => (
                                        <li key={participant.id} className="flex items-center justify-between">
                                            <span>{participant.displayName}</span>
                                            <span className="text-xs text-gray-500">{participant.type}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-3 text-xs text-gray-400">No players yet. Share the tournament ID to invite.</p>
                            )}
                        </div>
                    </div>
                )}

                <div className="mt-2 flex flex-col items-center gap-2">
                    {isOwner ? (
                        <button
                            onClick={onCancel}
                            className="text-center font-pirulen text-xs font-bold tracking-widest text-red-400 hover:text-red-300 transition-colors"
                        >
                            Cancel Tournament
                        </button>
                    ) : (
                        <button
                            onClick={onLeave}
                            className="text-center font-pirulen text-xs font-bold tracking-widest text-red-400 hover:text-red-300 transition-colors"
                        >
                            Leave Tournament
                        </button>
                    )}
                </div>
            </div>
        </CardStyle2>
    );
}
