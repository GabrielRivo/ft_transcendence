import { createElement, useEffect } from 'my-react';
import { useNavigate } from 'my-react-router';
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
				<p className="text-sm text-gray-400">Initializing local game...</p>
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
						<span className="font-mono text-xs text-gray-400">P1 (A/D)</span>
						<span className="font-pirulen text-3xl text-cyan-400">{player1Score}</span>
					</div>

					{/* Separator */}
					<div className="flex flex-col items-center">
						<span className="font-pirulen text-xl text-gray-500">VS</span>
					</div>

					{/* Player 2 score */}
					<div className="flex flex-col items-center">
						<span className="font-mono text-xs text-gray-400">P2 (J/L)</span>
						<span className="font-pirulen text-3xl text-pink-400">{player2Score}</span>
					</div>
				</div>

				{/* Victory condition */}
				<span className="font-mono text-xs text-gray-500">First to {scoreToWin} wins</span>
			</div>
		</div>
	);
}

function ControlsOverlay() {
	return (
		<div className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
			<div className="rounded-lg border border-gray-500/30 bg-slate-950/60 px-6 py-3 backdrop-blur-sm">
				<div className="flex items-center gap-8 text-xs text-gray-400">
					<div className="flex items-center gap-2">
						<span className="font-bold text-cyan-400">Player 1:</span>
						<kbd className="rounded border border-gray-600 bg-gray-800 px-2 py-0.5">A</kbd>
						<kbd className="rounded border border-gray-600 bg-gray-800 px-2 py-0.5">D</kbd>
					</div>
					<div className="h-4 w-px bg-gray-600" />
					<div className="flex items-center gap-2">
						<span className="font-bold text-pink-400">Player 2:</span>
						<kbd className="rounded border border-gray-600 bg-gray-800 px-2 py-0.5">J</kbd>
						<kbd className="rounded border border-gray-600 bg-gray-800 px-2 py-0.5">L</kbd>
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * Error overlay component.
 * Displayed when game initialization fails.
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
				<h2 className="font-pirulen text-xl tracking-widest text-red-400">GAME ERROR</h2>

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
			</div>
		</div>
	);
}

// =============================================================================
// Main Local Game Page Component
// =============================================================================

/**
 * Local game page component.
 * 
 * This page switches the game to local mode and displays the game overlays.
 * The actual game canvas is rendered in MainLayout via GameProvider.
 */
export const LocalGame = () => {
	const navigate = useNavigate();
	const { setMode, mode, error, isLoading, scores } = useGame();

	// Switch to local mode on mount, back to background on unmount
	useEffect(() => {
		// console.log('[LocalGamePage] Mounting - switching to local mode');
		setMode('local');

		return () => {
		// 	console.log('[LocalGamePage] Unmounting - switching back to background mode');
			setMode('background');
		};
	}, [setMode]);

	/**
	 * Handles retry action - resets the local game.
	 */
	const handleRetry = () => {
		setMode('background');
		setTimeout(() => setMode('local'), 100);
	};

	/**
	 * Handles exit action - switches back to background mode and navigates to play menu.
	 */
	const handleExit = () => {
		// console.log('[LocalGamePage] Exit clicked - switching to background mode');
		setMode('background');
		navigate('/play');
	};

	return (
		<div className="pointer-events-none absolute inset-0 z-25">
			{/* Loading overlay */}
			{isLoading && !error && <LoadingOverlay />}

			{/* Error overlay */}
			{error && <ErrorOverlay message={error} onRetry={handleRetry} />}

			{/* Score overlay (shown during gameplay) */}
			{!isLoading && !error && mode === 'local' && (
				<ScoreOverlay
					player1Score={scores.player1Score}
					player2Score={scores.player2Score}
					scoreToWin={scores.scoreToWin}
				/>
			)}

			{/* Controls overlay (shown during gameplay) */}
			{!isLoading && !error && mode === 'local' && <ControlsOverlay />}

			{/* Game mode indicator */}
			{!isLoading && !error && (
				<div className="pointer-events-none absolute top-4 left-4 z-30">
					<div className="rounded border border-cyan-500/30 bg-slate-950/60 px-3 py-1.5 backdrop-blur-sm">
						<p className="font-mono text-xs text-cyan-400">
							Mode: <span className="text-white">Local Multiplayer</span>
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

export default LocalGame;
