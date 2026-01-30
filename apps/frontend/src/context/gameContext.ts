import { createContext } from 'my-react';
import type { RefObject } from 'my-react/src/types/global';

export type GameMode = 'background' | 'online' | 'local';

export interface GameScores {
	player1Score: number;
	player2Score: number;
	scoreToWin: number;
}

export interface GameResult {
	gameId: string;
	winnerId: string | null;
	player1Id: string;
	player2Id: string;
	player1Score: number;
	player2Score: number;
	gameType: 'ranked' | 'tournament' | string;
	tournamentId?: string;
}

export interface PlayerInfo {
	id: string;
	username: string;
	avatar: string | null;
}

export interface GamePlayers {
	player1: PlayerInfo | null;
	player2: PlayerInfo | null;
	currentPlayer: 1 | 2 | null;
}

export interface GameContextType {
	mode: GameMode;
	setMode: (mode: GameMode, gameId?: string | null, metadata?: { type?: string; tournamentId?: string; tournamentType?: string; playersCount?: string }) => void;
	canvasRef: RefObject<HTMLCanvasElement | null>;
	isLoading: boolean;
	error: string | null;
	gameId: string | null;
	scores: GameScores;
	isInitialized: boolean;
	gameResult: GameResult | null;
	clearGameResult: () => void;
	isPaused: boolean;
	pauseMessage: string | null;
	players: GamePlayers;
}

export const GameContext = createContext<GameContextType | null>(null);

