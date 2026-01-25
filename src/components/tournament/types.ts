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
}

export interface CreateTournamentResponse {
    id: string;
}
