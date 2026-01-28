
import { createElement, useEffect } from 'my-react';
import { useNavigate, useQuery } from 'my-react-router';
import { useGame } from '../../hook/useGame';

function LoadingOverlay() {
	return (
		<div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
			<div className="flex flex-col items-center gap-4">
				<div className="relative h-16 w-16">
					<div className="absolute inset-0 animate-ping rounded-full border-2 border-cyan-500/30" />
					<div className="absolute inset-2 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
				</div>
				<p className="font-pirulen text-lg tracking-widest text-cyan-400">LOADING</p>
				<p className="text-sm text-gray-400">Connecting to game server...</p>
			</div>
		</div>
	);
}

function ScoreOverlay({
	player1Score,
	player2Score,
	scoreToWin,
}: {
	player1Score: number;
	player2Score: number;
	scoreToWin: number;
}) {
	return (
		<div className="pointer-events-none absolute top-4 left-1/2 z-30 -translate-x-1/2">
			<div className="flex flex-col items-center gap-1">
				{/* Score display */}
				<div className="flex items-center gap-6 rounded-lg border border-cyan-500/40 bg-slate-950/80 px-8 py-3 backdrop-blur-md">
					{/* Player 1 score */}
					<div className="flex flex-col items-center">
						<span className="font-mono text-xs text-gray-400">P1</span>
						<span className="font-pirulen text-3xl text-cyan-400">{player1Score}</span>
					</div>

					{/* Separator */}
					<div className="flex flex-col items-center">
						<span className="font-pirulen text-xl text-gray-500">VS</span>
					</div>

					{/* Player 2 score */}
					<div className="flex flex-col items-center">
						<span className="font-mono text-xs text-gray-400">P2</span>
						<span className="font-pirulen text-3xl text-pink-400">{player2Score}</span>
					</div>
				</div>

				{/* Victory condition */}
				<span className="font-mono text-xs text-gray-500">First to {scoreToWin} wins</span>
			</div>
		</div>
	);
}

/**
 * Error overlay component.
 * Displayed when game initialization or connection fails.
 */
function ErrorOverlay({ message, onRetry }: { message: string; onRetry: () => void }) {
	return (
		<div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm">
			<div className="flex max-w-md flex-col items-center gap-6 p-8">
				{/* Error icon */}
				<div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-500 bg-red-500/20">
					<svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>

				{/* Error title */}
				<h2 className="font-pirulen text-xl tracking-widest text-red-400">CONNECTION ERROR</h2>

				{/* Error message */}
				<p className="text-center text-sm text-gray-400">{message}</p>

				{/* Retry button */}
				<button
					onClick={onRetry}
					className="group relative overflow-hidden rounded-lg border-2 border-cyan-500 bg-cyan-500/10 px-8 py-3 font-bold text-cyan-400 transition-all duration-300 hover:bg-cyan-500/30 hover:text-white hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]"
				>
					<span className="relative z-10">TRY AGAIN</span>
					<div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-cyan-500/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
				</button>

				{/* Additional info */}
				<p className="text-xs text-gray-500">Redirecting to matchmaking in a few seconds...</p>
			</div>
		</div>
	);
}

// =============================================================================
// Main Game Page Component
// =============================================================================

/**
 * Game page component.
 * 
 * This page switches the game to online mode and displays the game overlays.
 * The actual game canvas is rendered in MainLayout via GameProvider.
 */
export const Game = () => {
	const navigate = useNavigate();
	const query = useQuery();
	const { setMode, mode, error, isLoading, gameId, scores } = useGame();

	// Get gameId from URL query
	const urlGameId = query.get('id');
	const type = query.get('type');
	const tournamentId = query.get('tournamentId');
	const tournamentType = query.get('tournamentType');
	const playersCount = query.get('playersCount');

	// Switch to online mode on mount, back to background on unmount
	useEffect(() => {
		// console.log('[GamePage] Mounting - switching to online mode with gameId:', urlGameId);

		// Pass metadata to GameProvider (used for display purposes, redirection is handled via WebSocket events)
		const metadata = {
			type: type || undefined,
			tournamentId: tournamentId || undefined,
			tournamentType: tournamentType || undefined,
			playersCount: playersCount || undefined
		};
		setMode('online', urlGameId, metadata);

		return () => {
		// 	console.log('[GamePage] Unmounting - switching back to background mode');
			setMode('background');
		};
	}, [setMode, urlGameId, type, tournamentId, tournamentType, playersCount]);

	/**
	 * Handles retry action - navigates back to matchmaking.
	 */
	const handleRetry = () => {
		setMode('background');
		navigate('/matchmaking');
	};

	/**
	 * Handles exit action - switches back to background mode and navigates to dashboard.
	 */
	const handleExit = async () => {
		// console.log('[GamePage] Exit clicked - surrendering game');

		try {
			// Call surrender endpoint
			await fetch('/api/game/games/surrender', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({}),
			});

			// console.log('[GamePage] Surrender successful - switching to background mode');
		} catch (err) {
			console.error('[GamePage] Failed to surrender game', err);
		} finally {
			// Always exit locally
			setMode('background');
			navigate('/play');
		}
	};

	return (
		<div className="pointer-events-none absolute inset-0 z-25">
			{/* Loading overlay */}
			{isLoading && !error && <LoadingOverlay />}

			{/* Error overlay */}
			{error && <ErrorOverlay message={error} onRetry={handleRetry} />}

			{/* Score overlay (shown during gameplay) */}
			{!isLoading && !error && mode === 'online' && (
				<ScoreOverlay
					player1Score={scores.player1Score}
					player2Score={scores.player2Score}
					scoreToWin={scores.scoreToWin}
				/>
			)}

			{/* Game info overlay (shown during gameplay for online mode) */}
			{!isLoading && !error && gameId && (
				<div className="pointer-events-none absolute top-4 left-4 z-30">
					<div className="rounded border border-cyan-500/30 bg-slate-950/60 px-3 py-1.5 backdrop-blur-sm">
						<p className="font-mono text-xs text-cyan-400">
							Game: <span className="text-white">{gameId.slice(0, 8)}...</span>
						</p>
					</div>
				</div>
			)}

			{/* Back button - needs pointer-events-auto to be clickable */}
			<div className="pointer-events-auto absolute top-4 right-4 z-30">
				<button
					onClick={handleExit}
					className="rounded border border-gray-500/50 bg-slate-950/60 px-3 py-1.5 text-xs text-gray-400 backdrop-blur-sm transition-all hover:border-cyan-500/50 hover:text-cyan-400"
				>
					← Exit
				</button>
			</div>
		</div>
	);
};

export default Game;
