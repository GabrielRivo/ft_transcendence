import { Tournament } from "../entities/tournament.js";

export abstract class TournamentRepository {
    abstract save(tournament: Tournament): Promise<void>;
    abstract findById(id: string): Promise<Tournament | null>;
    abstract findActiveByParticipantId(participantId: string): Promise<Tournament | null>;
    abstract findAll(): Promise<Tournament[]>;
}