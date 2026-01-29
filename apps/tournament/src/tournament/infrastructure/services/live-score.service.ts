import { Service } from 'my-fastify-decorators';

export interface ScoreData {
    scoreA: number;
    scoreB: number;
}

@Service()
export class LiveScoreService {
    // tournamentId -> matchId -> scores
    private scores = new Map<string, Map<string, ScoreData>>();

    public updateScore(tournamentId: string, matchId: string, scoreA: number, scoreB: number) {
        if (!this.scores.has(tournamentId)) {
            this.scores.set(tournamentId, new Map());
        }
        this.scores.get(tournamentId)!.set(matchId, { scoreA, scoreB });
    }

    public getScores(tournamentId: string): Map<string, ScoreData> {
        return this.scores.get(tournamentId) || new Map();
    }

    public removeMatch(tournamentId: string, matchId: string) {
        if (this.scores.has(tournamentId)) {
            this.scores.get(tournamentId)?.delete(matchId);
        }
    }

    public removeTournament(tournamentId: string) {
        this.scores.delete(tournamentId);
    }
}
