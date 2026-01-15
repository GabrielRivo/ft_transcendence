// =============================================================================
// Game Page
// =============================================================================
//
// This page renders the Pong game canvas and manages the game lifecycle.
// It integrates with the matchmaking flow by reading the gameId from URL.
//
// ## URL Format
//
// /game?id={gameId}
//
// The gameId is provided by the matchmaking service when a match is confirmed.
//
// ## Flow
//
// 1. User completes matchmaking -> receives gameId
// 2. Navigation to /game?id={gameId}
// 3. usePong extracts gameId and initializes game
// 4. Game connects to Game Service
// 5. When both players are connected, game starts
// 6. On game end, navigates back to dashboard
//
// ## Victory Condition
//
// First player to reach 5 points wins the game.
//
// ## Error States
//
// - Missing gameId: Redirects to /matchmaking
// - Connection error: Shows error message then redirects
// - Game engine error: Shows error message
//
// =============================================================================

import { createElement, useState, useEffect } from 'my-react';
import { useNavigate, useParams } from 'my-react-router';
import { usePong, type GameMode } from '../../hook/usePong';
import Services from '../../libs/pong/Game/Services/Services';

// =============================================================================
// Props
// =============================================================================

/**
 * Props for the Game component.
 */
interface GameProps {
	/**
	 * Game mode to launch.
	 * - 'background': AI vs AI, used as animated background (no overlays)
	 * - 'online': Real game with matchmaking and WebSocket
	 * - 'local': Local 2-player game
	 * @default 'online'
	 */
	mode?: GameMode;
}

// =============================================================================
// Types
// =============================================================================

/**
 * Score update event payload from the game engine.
 */
interface ScoreUpdateEvent {
	player1Score: number;
	player2Score: number;
	scoreToWin: number;
	player1Id: string;
	player2Id: string;
	lastScoredBy: string | null;
}

/**
 * Loading overlay component.
 * Displayed while the game is initializing or connecting.
 */
function LoadingOverlay() {
	return (
		<div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
			<div className="flex flex-col items-center gap-4">
				{/* Animated spinner */}
				<div className="relative h-16 w-16">
					<div className="absolute inset-0 animate-ping rounded-full border-2 border-cyan-500/30" />
					<div className="absolute inset-2 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
				</div>

				{/* Loading text */}
				<p className="font-pirulen text-lg tracking-widest text-cyan-400">LOADING</p>
				<p className="text-sm text-gray-400">Connecting to game server...</p>
			</div>
		</div>
	);
}

/**
 * Score display overlay component.
 * Shows the current scores during gameplay with victory condition.
 */
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
		<div className="pointer-events-none absolute top-4 left-1/2 z-10 -translate-x-1/2">
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
		<div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm">
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
					<div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
				</button>

				{/* Additional info */}
				<p className="text-xs text-gray-500">Redirecting to matchmaking in a few seconds...</p>
			</div>
		</div>
	);
}

/**
 * Main Game component.
 *
 * Renders the Pong game canvas with overlay states for loading and errors.
 * Supports three modes:
 * - 'background': AI vs AI for animated background (no overlays)
 * - 'online': Real game with matchmaking and WebSocket
 * - 'local': Local 2-player game
 */
export const Game = ({ mode = 'online' }: GameProps) => {
	const navigate = useNavigate();
	const params = useParams();
	const { gameRef, error, isLoading, gameId } = usePong({ mode });

	// In background mode, we don't show any overlays
	const isBackgroundMode = mode === 'background';

	// Track current scores via event bus
	const [scores, setScores] = useState({
		player1Score: 0,
		player2Score: 0,
		scoreToWin: 5,
	});

	// Listen to score updates from the game engine
	useEffect(() => {
		const handleScoreUpdate = (event: ScoreUpdateEvent) => {
			setScores({
				player1Score: event.player1Score,
				player2Score: event.player2Score,
				scoreToWin: event.scoreToWin,
			});
		};

		// Subscribe to score updates
		Services.EventBus?.on('Game:ScoreUpdated', handleScoreUpdate);

		// Cleanup on unmount
		return () => {
			Services.EventBus?.off('Game:ScoreUpdated', handleScoreUpdate);
		};
	}, []);

	/**
	 * Handles retry action - navigates back to matchmaking.
	 */
	const handleRetry = () => {
		navigate('/matchmaking');
	};

	// Background mode: just render the canvas, no overlays
	if (isBackgroundMode) {
		return (
			<div className="relative h-full w-full overflow-hidden">
				<canvas ref={gameRef} id="gameCanvas" className="block size-full blur-sm" />
			</div>
		);
	}

	// Online/Local mode: render canvas with overlays
	return (
		<div className="relative h-full w-full overflow-hidden bg-slate-950">
			{/* Game canvas - always rendered, but may be hidden by overlays */}
			<canvas ref={gameRef} id="gameCanvas" className={`block h-full w-full ${isLoading || error ? 'blur-sm' : ''}`} />

			{/* Loading overlay */}
			{isLoading && !error && <LoadingOverlay />}

			{/* Error overlay */}
			{error && <ErrorOverlay message={error} onRetry={handleRetry} />}

			{/* Score overlay (shown during gameplay for online mode) */}
			{!isLoading && !error && gameId && (
				<ScoreOverlay
					player1Score={scores.player1Score}
					player2Score={scores.player2Score}
					scoreToWin={scores.scoreToWin}
				/>
			)}

			{/* Game info overlay (shown during gameplay for online mode) */}
			{!isLoading && !error && gameId && (
				<div className="pointer-events-none absolute top-4 left-4 z-10">
					<div className="rounded border border-cyan-500/30 bg-slate-950/60 px-3 py-1.5 backdrop-blur-sm">
						<p className="font-mono text-xs text-cyan-400">
							Game: <span className="text-white">{gameId.slice(0, 8)}...</span>
						</p>
					</div>
				</div>
			)}

			{/* Back button (always visible in online/local mode) */}
			<div className="absolute top-4 right-4 z-20">
				<button
					onClick={() => navigate('/dashboard')}
					className="rounded border border-gray-500/50 bg-slate-950/60 px-3 py-1.5 text-xs text-gray-400 backdrop-blur-sm transition-all hover:border-cyan-500/50 hover:text-cyan-400"
				>
					← Exit
				</button>
			</div>
		</div>
	);
};

export default Game;
