import { createElement, useState, useEffect, useRef, useCallback, useMemo } from 'my-react';
import { useNavigate } from 'my-react-router';
import type { Element } from 'my-react';
import { GameContext, GameMode, GameScores } from './gameContext';
import Game from '../libs/pong/Game/index';
import Services from '../libs/pong/Game/Services/Services';
import { useToast } from '@/hook/useToast';

interface GameProviderProps {
	children?: Element;
}

export function GameProvider({ children }: GameProviderProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	const isInitializedRef = useRef(false);

	const [mode, setModeState] = useState<GameMode>('background');
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isInitialized, setIsInitialized] = useState(false);
	const [gameId, setGameId] = useState<string | null>(null);
	const navigate = useNavigate();
	const [scores, setScores] = useState<GameScores>({
		player1Score: 0,
		player2Score: 0,
		scoreToWin: 5,
	});
	const gameMetadataRef = useRef<{ type?: string; tournamentId?: string; tournamentType?: string; playersCount?: string }>({});

	const currentModeRef = useRef<GameMode>('background');


	// Handler for score updates
	const handleScoreUpdate = useCallback((event: {
		player1Score: number;
		player2Score: number;
		scoreToWin: number;
	}) => {
		setScores({
			player1Score: event.player1Score,
			player2Score: event.player2Score,
			scoreToWin: event.scoreToWin,
		});
	}, []);
	const handleScoreUpdateRef = useRef(handleScoreUpdate);
	useEffect(() => {
		handleScoreUpdateRef.current = handleScoreUpdate;
	}, [handleScoreUpdate]);

	useEffect(() => {
		if (isInitializedRef.current || !canvasRef.current) {
			return;
		}

		console.log('[GameProvider] Initializing game services...');
		isInitializedRef.current = true;

		try {
			Game.Services.init(canvasRef.current);
			setIsInitialized(true);
			setError(null);

			Services.EventBus?.on('Game:ScoreUpdated', (event: GameScores) => {
				handleScoreUpdateRef.current(event);
			});

			Services.EventBus?.on('Game:Ended', (event: { gameType?: string; tournamentId?: string }) => {
				console.log('[GameProvider] Game:Ended event received!', event);
				console.log('[GameProvider] Event payload - gameType:', event?.gameType, 'tournamentId:', event?.tournamentId);

				setModeState('background');

				// Use gameType from the event payload (set by PongOnline from gameJoined WebSocket event)
				const gameType = event?.gameType;
				const eventTournamentId = event?.tournamentId;

				console.log('[GameProvider] Extracted from event - gameType:', gameType, 'tournamentId:', eventTournamentId);

				if (gameType === 'ranked') {
					console.log('[GameProvider] gameType is ranked, navigating to /play');
					navigate('/play');
				} else if (gameType === 'tournament' && eventTournamentId) {
					console.log('[GameProvider] gameType is tournament, fetching tournament details...');
					// Fetch tournament details from API to get tournamentType and playersCount
					fetch(`/api/tournament/${eventTournamentId}`, {
						method: 'GET',
						credentials: 'include',
						headers: { 'Content-Type': 'application/json' },
					})
						.then(res => res.ok ? res.json() : null)
						.then(tournament => {
							if (tournament && tournament.visibility && tournament.size) {
								const tournamentType = tournament.visibility.toLowerCase();
								const playersCount = tournament.size;
								const targetUrl = `/play/tournament/${tournamentType}/${playersCount}?id=${eventTournamentId}`;
								console.log('[GameProvider] Navigating to tournament page:', targetUrl);
								navigate(targetUrl);
							} else {
								console.warn('[GameProvider] Could not fetch tournament details, falling back to /play');
								navigate('/play');
							}
						})
						.catch(err => {
							console.error('[GameProvider] Error fetching tournament:', err);
							navigate('/play');
						});
				}
				else {
					console.log('[GameProvider] Unknown gameType:', gameType, '- defaulting to /play');
					// Default fallback - navigate to /play for any game type
					navigate('/play');
				}
			});

			Game.Services.GameService!.launchGame('PongBackground');
			Game.Services.GameService!.startGame();

			setIsLoading(false);
			console.log('[GameProvider] Services initialized, background game started');
		} catch (err) {
			console.error('[GameProvider] Failed to initialize services:', err);
			setError(err instanceof Error ? err.message : 'Failed to initialize game engine');
			setIsLoading(false);
			isInitializedRef.current = false;
		}

	}, []);

	const setMode = useCallback((newMode: GameMode, newGameId?: string | null, metadata?: { type?: string; tournamentId?: string; tournamentType?: string; playersCount?: string }) => {
		// Always store metadata FIRST, before any early returns
		// This ensures metadata is preserved even on duplicate setMode calls
		if (metadata) {
			console.log('[GameProvider] Storing metadata:', JSON.stringify(metadata));
			gameMetadataRef.current = metadata;
		}

		if (currentModeRef.current === newMode) {
			console.log('[GameProvider] Mode already set to:', newMode);
			return;
		}

		console.log('[GameProvider] Switching mode from', currentModeRef.current, 'to', newMode);
		currentModeRef.current = newMode;
		setModeState(newMode);

		if (newGameId !== undefined) {
			setGameId(newGameId);
		} else if (newMode === 'background') {
			setGameId(null);
		}

		if (!isInitialized) {
			console.warn('[GameProvider] Cannot switch mode - services not initialized');
			return;
		}

		setScores({
			player1Score: 0,
			player2Score: 0,
			scoreToWin: 5,
		});

		setIsLoading(true);
		setError(null);

		try {
			const gameType = newMode === 'background'
				? 'PongBackground'
				: newMode === 'local'
					? 'PongLocal'
					: 'PongOnline';

			Game.Services.GameService!.launchGame(gameType);
			Game.Services.GameService!.startGame();

			//autofocus
			if (newMode === 'online' || newMode === 'local') {
				setTimeout(() => {
					if (canvasRef.current) {
						canvasRef.current.focus();
						console.log('[GameProvider] Canvas focused for keyboard input');
					}
				}, 100);
			}

			setIsLoading(false);
			console.log('[GameProvider] Mode switched successfully to:', newMode);
		} catch (err) {
			console.error('[GameProvider] Failed to switch mode:', err);
			setError(err instanceof Error ? err.message : 'Failed to switch game mode');
			setIsLoading(false);
		}
	}, [isInitialized]);

	const contextValue = useMemo(() => ({
		mode,
		setMode,
		canvasRef,
		isLoading,
		error,
		gameId,
		scores,
		isInitialized,
	}), [mode, setMode, isLoading, error, gameId, scores, isInitialized]);

	return (
		<GameContext.Provider value={contextValue}>
			{children}
		</GameContext.Provider>
	);
}

export default GameProvider;
