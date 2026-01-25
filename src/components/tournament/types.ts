export type TournamentVisibility = 'PUBLIC' | 'PRIVATE';
export type TournamentStatus = 'CREATED' | 'STARTED' | 'FINISHED' | 'CANCELED';

export interface TournamentParticipant {
    id: string;
    displayName: string;
    type: string;
}

export interface TournamentResponse {
    id: string;
    name: string;
    size: number;
    ownerId: string;
    visibility: TournamentVisibility;
    status: TournamentStatus;
    participants: TournamentParticipant[];
    matches?: Match[];
}

export interface Match {
    id: string;
    round: number;
    position: number;
    playerA: TournamentParticipant | null;
    playerB: TournamentParticipant | null;
    scoreA: number;
    scoreB: number;
    winner: TournamentParticipant | null;
    status: 'PENDING' | 'IN_PROGRESS' | 'FINISHED';
}

export interface CreateTournamentResponse {
    id: string;
}
