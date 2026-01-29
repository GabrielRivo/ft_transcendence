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

		isInitializedRef.current = true;

		try {
			Game.Services.init(canvasRef.current);
			setIsInitialized(true);
			setError(null);

			Services.EventBus?.on('Game:ScoreUpdated', (event: GameScores) => {
				handleScoreUpdateRef.current(event);
			});

			Services.EventBus?.on('Game:Ended', (event: { gameType?: string; tournamentId?: string }) => {
				setModeState('background');

				const gameType = event?.gameType;
				const eventTournamentId = event?.tournamentId;

				if (gameType === 'ranked') {
					navigate('/play');
				} else if (gameType === 'tournament' && eventTournamentId) {
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
								navigate(targetUrl);
							} else {
								navigate('/play');
							}
						})
						.catch(err => {
							navigate('/play');
						});
				}
				else {
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
