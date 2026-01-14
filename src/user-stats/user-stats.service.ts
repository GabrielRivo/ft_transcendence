import Database, { Statement } from 'better-sqlite3';
import { InjectPlugin, Service } from 'my-fastify-decorators';

export interface UserStatsValues {
	user_id: number;
	total_games: number;
	wins: number;
	losses: number;
	tournament_played: number;
	tournament_won: number;
	average_score: number;
	average_game_duration_in_seconde: number;
}

@Service()
export class UserStatsService {
	@InjectPlugin('db')
	private db!: Database.Database;
	private statementGetStats!: Statement<number>;
	private statementUserStats!: Statement<UserStatsValues>;

	onModuleInit() {
		this.statementGetStats = this.db.prepare(`
			SELECT * FROM user_stats WHERE user_id = ?
		`);
		this.statementUserStats = this.db.prepare(`
			INSERT INTO user_stats (user_id, total_games, wins, losses, tournament_played,
				tournament_won, average_score, average_game_duration_in_seconde, updated_at)
			VALUES (@user_id, @total_games, @wins, @losses, @tournament_played, @tournament_won, @average_score, @average_game_duration_in_seconde, CURRENT_TIMESTAMP)
			ON CONFLICT(user_id) DO UPDATE SET total_games = EXCLUDED.total_games, wins = EXCLUDED.wins,
			losses = EXCLUDED.losses, tournament_played = EXCLUDED.tournament_played, tournament_won = EXCLUDED.tournament_won,
			average_score = EXCLUDED.average_score, average_game_duration_in_seconde = EXCLUDED.average_game_duration_in_seconde,
			updated_at = CURRENT_TIMESTAMP
		`);
	}
	async getGlobalStats(userId: number) {
		return this.statementGetStats.get(userId) as UserStatsValues | undefined;
	}

	private updateStats(current: UserStatsValues, match: any): UserStatsValues {
		const n = current.total_games + 1;

		return {
			user_id: current.user_id,
			total_games: n,
			wins: current.wins + (match.win ? 1 : 0),
			losses: current.losses + (match.loss ? 1 : 0),
			tournament_played: current.tournament_played + (match.isTournament ? 1 : 0),
			tournament_won: current.tournament_won + (match.wonTournament ? 1 : 0),
			average_score: Math.round((current.average_score * current.total_games + match.score) / n),
			average_game_duration_in_seconde: Math.round(
				(current.average_game_duration_in_seconde * current.total_games + match.duration) / n,
			),
		};
	}

	async updateUserGlobalStats(userId: number, matchData: any) {
		const current = (this.statementGetStats.get(userId) as UserStatsValues) || {
			user_id: userId,
			total_games: 0,
			wins: 0,
			losses: 0,
			tournament_played: 0,
			tournament_won: 0,
			average_score: 0,
			average_game_duration_in_seconde: 0,
		};
		const nextStats = this.updateStats(current, matchData);
		return this.statementUserStats.run(nextStats);
	}
}
