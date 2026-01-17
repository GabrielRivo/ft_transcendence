// Statuts du tournoi
export type TournamentStatus = 'PENDING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
export type startMode = 'MANUAL' | 'AUTO_FULL' | 'AUTO_TIMER';
export type MatchStatus = 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
export type ParticipantStatus = 'ACTIVE' | 'ELIMINATED' | 'DISQUALIFIED';

// Interface Participant generique (Guest ou User)
export interface Participant {
    id: string;
    alias: string;
    type: 'guest' | 'registered';
    userId: number | null;
    avatar?: string;
}

// Structure d'un match dans l'arbre
export interface BracketMatch {
    id: string;
    round: number;
    status: MatchStatus;
    player1Id: string | null;
    player2Id: string | null;
    winnerId: string | null;
    score: [number, number] | null;
    gameId?: string;
    startTime?: string;
    endTime?: string;
}

// Structure complete du bracket (JSON stocke en DB)
export interface BracketData {
    currentRound: number;
    totalRounds: number;
    matches: BracketMatch[];
}