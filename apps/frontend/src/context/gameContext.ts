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
}

export const GameContext = createContext<GameContextType | null>(null);

