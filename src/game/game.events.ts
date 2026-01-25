export interface GameFinishedEvent {
    eventName: 'game.finished';
    gameId: string;
    player1Id: string;
    player2Id: string;
    score1: number;
    score2: number;
    winnerId: string | null; // null if draw or cancelled
    reason: 'score_limit' | 'surrender' | 'disconnection' | 'timeout';
    timestamp: number;
}

export interface GameScoreUpdatedEvent {
    eventName: 'game.score_updated';
    gameId: string;
    player1Id: string;
    player2Id: string;
    score1: number;
    score2: number;
    timestamp: number;
}
