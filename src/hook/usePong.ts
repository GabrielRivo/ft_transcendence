// =============================================================================
// usePong Hook
// =============================================================================
//
// This hook manages the Pong game lifecycle within React components.
// It handles canvas initialization, game instantiation, and proper cleanup.
//
// ## Integration with Matchmaking
//
// For online games, the hook extracts the gameId from URL query parameters:
// - URL: /game?id={gameId}
// - The gameId is passed to PongOnline for server connection
//
// ## Usage Flow
//
// 1. User completes matchmaking -> receives gameId
// 2. Navigation to /game?id={gameId}
// 3. usePong extracts gameId from URL
// 4. Creates PongOnline with gameId
// 5. Connects to Game Service
// 6. Game starts when both players are ready
//
// ## Error Handling
//
// - Missing gameId: Shows error and navigates to matchmaking
// - Connection errors: Passed to onConnectionError callback
// - Game end: Navigates back to dashboard
//
// =============================================================================

import { useEffect, useRef, useState, useCallback } from 'my-react';
import { useQuery, useNavigate } from 'my-react-router';

// Note: Using type import to avoid circular dependency issues
import type { RefObject } from 'my-react/src/types/global';

import Game from '../libs/pong/Game/index';
import type { GameEndResult } from '../libs/pong/Game/Game/PongOnline';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Return type for the usePong hook.
 */
export interface UsePongReturn {
	/** Ref to attach to the canvas element */
	gameRef: RefObject<HTMLCanvasElement | null>;

	/** Game services singleton (for advanced usage) */
	Services: typeof Game.Services;

	/** Current game ID (null if not set or in background/local mode) */
	gameId: string | null;

	/** Error message if game initialization failed */
	error: string | null;

	/** Whether the game is currently loading */
	isLoading: boolean;

	/** Current game mode */
	mode: GameMode;
}

/**
 * Game mode for the Pong game.
 * - 'background': AI vs AI, used as animated background in layout
 * - 'online': Real game with matchmaking and WebSocket
 * - 'local': Local 2-player game
 */
export type GameMode = 'background' | 'online' | 'local';

/**
 * Configuration options for the usePong hook.
 */
export interface UsePongConfig {
	/**
	 * Game mode to launch.
	 * - 'background': AI vs AI (no controls, no overlays)
	 * - 'online': WebSocket game with matchmaking
	 * - 'local': Local 2-player game
	 * @default 'online'
	 */
	mode?: GameMode;

	/**
	 * Override gameId instead of getting from URL.
	 * Useful for testing or alternative flows.
	 * Only used in 'online' mode.
	 */
	gameIdOverride?: string;

	/**
	 * Callback when game ends.
	 * If not provided, navigates to /dashboard.
	 * Not used in 'background' mode.
	 */
	onGameEnd?: (result: GameEndResult) => void;

	/**
	 * Callback when connection error occurs.
	 * If not provided, sets error state and navigates to /matchmaking.
	 * Only used in 'online' mode.
	 */
	onConnectionError?: (error: string) => void;
}

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

/**
 * Hook for managing Pong game lifecycle.
 *
 * Handles canvas initialization, game instantiation with proper gameId,
 * and cleanup on unmount.
 *
 * @param config - Optional configuration options
 * @returns Object containing gameRef, Services, gameId, error, and isLoading
 *
 * @example
 * ```tsx
 * // Basic usage in Game page
 * function GamePage() {
 *   const { gameRef, error, isLoading } = usePong();
 *
 *   if (error) {
 *     return <div>Error: {error}</div>;
 *   }
 *
 *   if (isLoading) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   return <canvas ref={gameRef} className="h-full w-full" />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With custom callbacks
 * function GamePage() {
 *   const navigate = useNavigate();
 *
 *   const { gameRef } = usePong({
 *     gameType: 'PongOnline',
 *     onGameEnd: (result) => {
 *       console.log('Game ended:', result);
 *       navigate('/results');
 *     },
 *     onConnectionError: (error) => {
 *       showToast({ type: 'error', message: error });
 *     },
 *   });
 *
 *   return <canvas ref={gameRef} className="h-full w-full" />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Local game (no matchmaking required)
 * function LocalGamePage() {
 *   const { gameRef } = usePong({ gameType: 'PongLocal' });
 *   return <canvas ref={gameRef} className="h-full w-full" />;
 * }
 * ```
 */
export const usePong = (config?: UsePongConfig): UsePongReturn => {
	const navigate = useNavigate();
	const query = useQuery();

	// Canvas ref for Babylon.js
	const gameRef = useRef<HTMLCanvasElement | null>(null);

	// State
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Extract configuration with defaults
	const mode = config?.mode ?? 'online';
	const gameIdOverride = config?.gameIdOverride;

	// Map mode to game type for GameService
	const gameType = mode === 'background' ? 'PongBackground' : mode === 'local' ? 'PongLocal' : 'PongOnline';

	// Get gameId from URL query or override (only relevant for online mode)
	const gameId = mode === 'online' ? (gameIdOverride ?? query.get('id')) : null;

	// -------------------------------------------------------------------------
	// Stable Callback Refs
	// -------------------------------------------------------------------------
	// Use refs to store callbacks to avoid re-triggering the useEffect.
	// This prevents the socket connect/disconnect loop caused by unstable
	// callback dependencies.

	const onGameEndRef = useRef(config?.onGameEnd);
	const onConnectionErrorRef = useRef(config?.onConnectionError);
	const navigateRef = useRef(navigate);

	// Track if game has been initialized to prevent multiple initializations
	const isInitializedRef = useRef(false);

	// Keep refs up to date in a useEffect to satisfy React rules
	useEffect(() => {
		onGameEndRef.current = config?.onGameEnd;
		onConnectionErrorRef.current = config?.onConnectionError;
		navigateRef.current = navigate;
	});

	// -------------------------------------------------------------------------
	// Stable Callbacks (using refs internally)
	// -------------------------------------------------------------------------

	/**
	 * Stable handler for game end.
	 * Uses ref to call the current callback without changing identity.
	 */
	const stableOnGameEnd = useCallback((result: GameEndResult) => {
		console.log('[usePong] Game ended:', result);
		if (onGameEndRef.current) {
			onGameEndRef.current(result);
		} else {
			navigateRef.current('/dashboard');
		}
	}, []);

	/**
	 * Stable handler for connection errors.
	 * Uses ref to call the current callback without changing identity.
	 */
	const stableOnConnectionError = useCallback((errorMessage: string) => {
		console.error('[usePong] Connection error:', errorMessage);
		setError(errorMessage);

		if (onConnectionErrorRef.current) {
			onConnectionErrorRef.current(errorMessage);
		} else {
			// Navigate back to matchmaking after a short delay
			setTimeout(() => {
				navigateRef.current('/matchmaking');
			}, 3000);
		}
	}, []);

	// -------------------------------------------------------------------------
	// Game Initialization Effect
	// -------------------------------------------------------------------------
	// IMPORTANT: Only depend on gameType and gameId to prevent reconnection loops.
	// Callbacks are accessed via refs to maintain stable dependencies.

	useEffect(() => {
		console.log('[usePong] Initializing...', { mode, gameType, gameId });

		// Validate canvas ref
		if (!gameRef.current) {
			console.warn('[usePong] Canvas ref not ready, waiting...');
			return;
		}

		// Prevent multiple initializations (can happen with strict mode)
		if (isInitializedRef.current) {
			console.warn('[usePong] Already initialized, skipping...');
			return;
		}

		// Validate gameId for online games only
		if (mode === 'online' && !gameId) {
			const errorMessage = 'Missing game ID. Please use matchmaking to find a game.';
			console.error('[usePong]', errorMessage);
			setError(errorMessage);
			setIsLoading(false);

			// Navigate to matchmaking after delay
			setTimeout(() => {
				navigateRef.current('/matchmaking');
			}, 2000);

			return;
		}

		// Initialize game services with canvas
		try {
			Game.Services.init(gameRef.current);
		} catch (err) {
			console.error('[usePong] Failed to initialize services:', err);
			setError('Failed to initialize game engine.');
			setIsLoading(false);
			return;
		}

		// Mark as initialized to prevent re-initialization
		isInitializedRef.current = true;

		// Launch the game
		try {
			// For background mode, we don't need callbacks
			/*const launchConfig = mode === 'background'
				? {}
				: {
					gameId: gameId ?? undefined,
					onGameEnd: stableOnGameEnd,
					onConnectionError: stableOnConnectionError,
				};*/

			Game.Services.GameService!.launchGame(gameType, /*launchConfig*/);

			// Start the game (connects to server for online games)
			Game.Services.GameService!.startGame();

			setIsLoading(false);
			setError(null);
		} catch (err) {
			console.error('[usePong] Failed to launch game:', err);
			setError(err instanceof Error ? err.message : 'Failed to launch game.');
			setIsLoading(false);
		}

		// Cleanup on unmount only
		return () => {
			console.log('[usePong] Cleaning up...');
			isInitializedRef.current = false;
			Game.Services.disposeServices();
		};
	}, [mode, gameType, gameId, stableOnGameEnd, stableOnConnectionError]);

	// -------------------------------------------------------------------------
	// Return Value
	// -------------------------------------------------------------------------

	return {
		gameRef,
		Services: Game.Services,
		gameId,
		error,
		isLoading,
		mode,
	};
};

// Default export for backward compatibility
export default usePong;
