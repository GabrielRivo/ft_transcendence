import { createContext } from 'my-react';
import type { RefObject } from 'my-react/src/types/global';

export type GameMode = 'background' | 'online' | 'local';

export interface GameScores {
	player1Score: number;
	player2Score: number;
	scoreToWin: number;
}

export interface EndingScreenData {
	winnerId: string | null;
	reason: 'score_limit' | 'surrender' | 'disconnection' | 'timeout' | null;
	player1Id: string;
	player2Id: string;
	score1: number;
	score2: number;
	winning: boolean;
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
	endingScreen: EndingScreenData;
}

export const GameContext = createContext<GameContextType | null>(null);

