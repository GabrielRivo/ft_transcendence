import { createElement, useState, useEffect, useRef, useCallback, useMemo } from 'my-react';
import { useNavigate } from 'my-react-router';
import type { Element } from 'my-react';
import { GameContext, GameMode, GameScores, GameResult, GamePlayers, PlayerInfo } from './gameContext';
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

	// Game result state for end-of-game modal (ranked games)
	const [gameResult, setGameResult] = useState<GameResult | null>(null);

	// Pause state for opponent disconnection overlay
	const [isPaused, setIsPaused] = useState(false);
	const [pauseMessage, setPauseMessage] = useState<string | null>(null);

	// Players info for score overlay
	const [players, setPlayers] = useState<GamePlayers>({
		player1: null,
		player2: null,
		currentPlayer: null,
	});

	const currentModeRef = useRef<GameMode>('background');
	
	// Store metadata for tournament redirects
	const gameMetadataRef = useRef<{ type?: string; tournamentId?: string; tournamentType?: string; playersCount?: string } | null>(null);


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

		isInitializedRef.current = true;

		try {
			Game.Services.init(canvasRef.current);
			setIsInitialized(true);
			setError(null);

			Services.EventBus?.on('Game:ScoreUpdated', (event: GameScores) => {
				handleScoreUpdateRef.current(event);
			});

			Services.EventBus?.on('Game:Paused', (event: { paused: boolean; message?: string }) => {
				setIsPaused(event.paused);
				setPauseMessage(event.paused ? (event.message || 'Waiting for opponent...') : null);
			});

			Services.EventBus?.on('Game:PlayersInfo', async (event: { player1Id: string; player2Id: string; currentPlayer: 1 | 2 }) => {
				// Fetch player profiles
				const fetchProfile = async (userId: string): Promise<PlayerInfo | null> => {
					try {
						const response = await fetch(`/api/user/profile/${userId}`, { credentials: 'include' });
						if (response.ok) {
							const data = await response.json();
							return { id: String(data.id), username: data.username, avatar: data.avatar };
						}
					} catch (e) {
						// console.error('Failed to fetch player profile:', e);
					}
					return null;
				};

				const [p1, p2] = await Promise.all([
					fetchProfile(event.player1Id),
					fetchProfile(event.player2Id),
				]);

				setPlayers({
					player1: p1,
					player2: p2,
					currentPlayer: event.currentPlayer,
				});
			});

			Services.EventBus?.on('Game:Ended', (event: { 
				gameType?: string; 
				tournamentId?: string;
				winnerId?: string | null;
				player1Id?: string;
				player2Id?: string;
				player1Score?: number;
				player2Score?: number;
			}) => {
				setModeState('background');

				const gameType = event?.gameType;
				const eventTournamentId = event?.tournamentId;
				const metadata = gameMetadataRef.current;

				// Clear metadata after use
				gameMetadataRef.current = null;

				if (gameType === 'tournament' && eventTournamentId) {
					// Tournament: Direct redirect using stored metadata
					const tournamentType = metadata?.tournamentType || 'private';
					const playersCount = metadata?.playersCount || '8';
					const targetUrl = `/play/tournament/${tournamentType}/${playersCount}?id=${eventTournamentId}`;
					navigate(targetUrl);
				} else if (gameType === 'ranked') {
					// Ranked: Set result for modal and navigate to /play
					setGameResult({
						gameId: metadata?.tournamentId || 'unknown',
						winnerId: event.winnerId ?? null,
						player1Id: event.player1Id ?? '',
						player2Id: event.player2Id ?? '',
						player1Score: event.player1Score ?? 0,
						player2Score: event.player2Score ?? 0,
						gameType: 'ranked',
					});
					// Navigate to /play - the modal will be shown there
					navigate('/play');
				} else {
					// Fallback: always navigate away from game page
					navigate('/play');
				}
			});

			Game.Services.GameService!.launchGame('PongBackground');
			Game.Services.GameService!.startGame();

			setIsLoading(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to initialize game engine');
			setIsLoading(false);
			isInitializedRef.current = false;
		}
	}, []);

	const setMode = useCallback((newMode: GameMode, newGameId?: string | null, metadata?: { type?: string; tournamentId?: string; tournamentType?: string; playersCount?: string }) => {
		if (currentModeRef.current === newMode) {
			return;
		}

		currentModeRef.current = newMode;
		setModeState(newMode);

		// Store metadata for later use in Game:Ended handler
		if (metadata) {
			gameMetadataRef.current = metadata;
		}

		if (newGameId !== undefined) {
			setGameId(newGameId);
		} else if (newMode === 'background') {
			setGameId(null);
		}

		if (!isInitialized) {
			return;
		}

		setScores({
			player1Score: 0,
			player2Score: 0,
			scoreToWin: 5,
		});

		// Reset players info when switching modes
		setPlayers({
			player1: null,
			player2: null,
			currentPlayer: null,
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
					}
				}, 100);
			}

			setIsLoading(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to switch game mode');
			setIsLoading(false);
		}
	}, [isInitialized]);

	const clearGameResult = useCallback(() => {
		setGameResult(null);
	}, []);

	const contextValue = useMemo(() => ({
		mode,
		setMode,
		canvasRef,
		isLoading,
		error,
		gameId,
		scores,
		isInitialized,
		gameResult,
		clearGameResult,
		isPaused,
		pauseMessage,
		players,
	}), [mode, setMode, isLoading, error, gameId, scores, isInitialized, gameResult, clearGameResult, isPaused, pauseMessage, players]);

	return (
		<GameContext.Provider value={contextValue}>
			{children}
		</GameContext.Provider>
	);
}

export default GameProvider;
