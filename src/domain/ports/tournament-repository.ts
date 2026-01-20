import { Tournament } from "../entities/tournament.js";

export interface TournamentRepository {
    save(tournament: Tournament): Promise<void>;
    findById(id: string): Promise<Tournament | null>;
    findActiveByParticipantId(participantId: string): Promise<Tournament | undefined>;
    findAll(): Promise<Tournament[]>;
}