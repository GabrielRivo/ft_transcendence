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
    const currentCount = tournament?.participants.length || 0;
    const maxCount = tournament?.size || 8;
    const progress = (currentCount / maxCount) * 100;
    const isFull = currentCount >= maxCount;

    return (
        <CardStyle2 className="w-full max-w-3xl">
            <div className="flex w-full flex-col gap-4">
                {/* Header */}
                <div className="flex flex-col items-center">
                    <h3 className="font-pirulen text-xl tracking-widest text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                        {tournament?.name || tournamentName}
                    </h3>
                    <p className="mt-2 text-sm text-gray-400">
                        Waiting for players to join...
                    </p>
                    {tournament?.inviteCode && (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs text-gray-500">Code:</span>
                            <span className="font-mono text-sm text-gray-400">
                                {tournament.inviteCode}
                            </span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(tournament.inviteCode);
                                }}
                                className="rounded border border-gray-600 bg-gray-700/50 px-2 py-0.5 text-xs text-gray-400 hover:bg-gray-600/50 hover:text-gray-300 transition-colors"
                            >
                                Copy
                            </button>
                        </div>
                    )}
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                        <span className="font-mono text-xs tracking-widest">LOADING TOURNAMENT</span>
                    </div>
                )}

                {/* Error State */}
                {loadError && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center">
                        <p className="font-pirulen text-xs tracking-widest text-red-300">Unable to load tournament</p>
                        <p className="mt-2 text-xs text-gray-400">{loadError}</p>
                        <div className="mt-4 flex justify-center">
                            <ButtonStyle3 onClick={onRetry}>Retry</ButtonStyle3>
                        </div>
                    </div>
                )}

                {/* Tournament Info */}
                {tournament && (
                    <div className="flex flex-col gap-6">
                        {/* Progress Section */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Players</span>
                                <span className={`font-mono font-bold ${isFull ? 'text-green-400' : 'text-cyan-400'}`}>
                                    {currentCount}/{maxCount}
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-800/60 border border-white/10">
                                <div
                                    className={`absolute left-0 top-0 h-full transition-all duration-500 ease-out rounded-full
                                        ${isFull
                                            ? 'bg-linear-to-r from-green-500 to-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.6)]'
                                            : 'bg-linear-to-r from-cyan-500 to-blue-500 shadow-[0_0_15px_rgba(34,211,238,0.4)]'
                                        }`}
                                    style={`width: ${progress}%`}
                                />
                                {/* Animated shimmer effect */}
                                {!isFull && (
                                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                                )}
                            </div>

                            {isFull && (
                                <p className="text-center text-sm text-green-400 font-bold animate-pulse">
                                    Tournament is ready to start!
                                </p>
                            )}
                        </div>

                        {/* Info Badges */}
                        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-cyan-400">
                                {tournament.visibility === 'PUBLIC' ? '🌐 Public' : '🔒 Private'}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-300">
                                {tournament.size} Players
                            </span>
                        </div>

                        {/* Players List */}
                        <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                            <h4 className="font-pirulen text-xs tracking-widest text-cyan-400 mb-3">PLAYERS</h4>
                            {tournament.participants.length > 0 ? (
                                <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
                                    {tournament.participants.map((participant, index) => (
                                        <li
                                            key={participant.id}
                                            className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm transition-all hover:bg-white/10"
                                        >
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">
                                                {index + 1}
                                            </span>
                                            <span className="flex-1 text-gray-200">{participant.displayName}</span>
                                            {participant.id === tournament.ownerId && (
                                                <span className="text-[10px] text-yellow-400 font-bold">👑 HOST</span>
                                            )}
                                        </li>
                                    ))}
                                    {/* Empty slots */}
                                    {Array.from({ length: maxCount - currentCount }).map((_, i) => (
                                        <li
                                            key={`empty-${i}`}
                                            className="flex items-center gap-3 rounded-lg border border-dashed border-white/10 px-3 py-2 text-sm text-gray-500"
                                        >
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-xs">
                                                {currentCount + i + 1}
                                            </span>
                                            <span className="italic">Waiting...</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-xs text-gray-400">No players yet. Share the tournament to invite.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col items-center gap-2 pt-2">
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
