import { createContext } from 'my-react';
import type { RefObject } from 'my-react/src/types/global';

export type GameMode = 'background' | 'online' | 'local';

export interface GameScores {
	player1Score: number;
	player2Score: number;
	scoreToWin: number;
}

export interface GameContextType {
	mode: GameMode;
	setMode: (mode: GameMode, gameId?: string | null) => void;
	canvasRef: RefObject<HTMLCanvasElement | null>;
	isLoading: boolean;
	error: string | null;
	gameId: string | null;
	scores: GameScores;
	isInitialized: boolean;
}

export const GameContext = createContext<GameContextType | null>(null);

