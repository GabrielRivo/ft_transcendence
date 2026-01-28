export interface GameFinishedEvent {
	eventName: 'game.finished';
	gameId: string;
	gameType: "tournament" | "ranked" | "friend";
	player1Id: string;
	player2Id: string;
	score1: number;
	score2: number;
	winnerId: string | null;
	reason: 'score_limit' | 'surrender' | 'disconnection' | 'timeout';
	timestamp: number;
	hitPlayer1: number;
	hitPlayer2: number;
	isTournamentFinal: boolean;
}
