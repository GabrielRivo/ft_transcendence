import { createElement, useState, useEffect, useRef, useCallback, useMemo } from 'my-react';
import { useNavigate } from 'my-react-router';
import type { Element } from 'my-react';
import { GameContext, EndingScreenData, GameMode, GameScores } from './gameContext';
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
	const { toast } = useToast();
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


	// Handler for game ending
	const handleEndingScreen = useCallback((event: EndingScreenData) => {
		console.log('[GameProvider] Game ended:', event);
	}, []);
	const handleEndingScreenRef = useRef(handleEndingScreen);
	useEffect(() => {
		handleEndingScreenRef.current = handleEndingScreen;
	}, [handleEndingScreen]);


	
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

			Services.EventBus?.on('Game:EndingScreen', (event: EndingScreenData) => {
				handleEndingScreenRef.current(event);
			});

			Services.EventBus?.on('Game:Ended', () => {
				setModeState('background');
				toast('Game ended', 'warning');

				// Redirection logic
				// Priority to stored metadata which is explicitly passed
				const { type, tournamentId, tournamentType, playersCount } = gameMetadataRef.current;

				if (type === 'ranked') {
					navigate('/');
				} else if (type === 'tournament' && tournamentId && tournamentType && playersCount) {
					navigate(`/play/tournament/${tournamentType}/${playersCount}?id=${tournamentId}`);
				} else {
					// Fallback to URL params if metadata wasn't set (e.g. reload)
					const searchParams = new URLSearchParams(window.location.search);
					const urlType = searchParams.get('type');
					if (urlType === 'ranked') {
						navigate('/');
					} else if (urlType === 'tournament') {
						const urlTournamentId = searchParams.get('tournamentId');
						const urlTournamentType = searchParams.get('tournamentType');
						const urlPlayersCount = searchParams.get('playersCount');
						if (urlTournamentId && urlTournamentType && urlPlayersCount) {
							navigate(`/play/tournament/${urlTournamentType}/${urlPlayersCount}?id=${urlTournamentId}`);
						}
					}
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
		if (currentModeRef.current === newMode) {
			console.log('[GameProvider] Mode already set to:', newMode);
			return;
		}

		console.log('[GameProvider] Switching mode from', currentModeRef.current, 'to', newMode);
		currentModeRef.current = newMode;
		setModeState(newMode);

		if (metadata) {
			gameMetadataRef.current = metadata;
		}

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
