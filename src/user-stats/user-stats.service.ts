import Database, { Statement } from 'better-sqlite3';
import { InjectPlugin, Service } from 'my-fastify-decorators';

export interface UserStatsValues {
	user_id: number;
	elo: number;
	total_games: number;
	wins: number;
	losses: number;
	winrate: number | null;
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
	private statementGetAllElos!: Statement<[]>;
	private statementRegisterUser!: Statement;
	private statementChangeUsername!: Statement;


	onModuleInit() {
		this.statementGetStats = this.db.prepare(
			`SELECT * FROM user_stats WHERE user_id = ?`);

		this.statementGetAllElos = this.db.prepare('SELECT elo FROM user_stats');

		this.statementUserStats = this.db.prepare(
		`INSERT INTO user_stats (user_id, elo, total_games, wins, losses, winrate, tournament_played,
			tournament_won, average_score, average_game_duration_in_seconde, updated_at)
		VALUES (@user_id, @elo, @total_games, @wins, @losses, @winrate, @tournament_played, @tournament_won, @average_score, @average_game_duration_in_seconde, CURRENT_TIMESTAMP)
		ON CONFLICT(user_id) DO UPDATE SET elo = EXCLUDED.elo, total_games = EXCLUDED.total_games, wins = EXCLUDED.wins,
			losses = EXCLUDED.losses, winrate = EXCLUDED.winrate, tournament_played = EXCLUDED.tournament_played, tournament_won = EXCLUDED.tournament_won,
			average_score = EXCLUDED.average_score, average_game_duration_in_seconde = EXCLUDED.average_game_duration_in_seconde,
			updated_at = CURRENT_TIMESTAMP`);

		this.statementRegisterUser = this.db.prepare(`INSERT INTO user_stats (user_id) VALUES (@user_id)`)
		this.statementChangeUsername = this.db.prepare(`UPDATE user_stats SET username = @username WHERE user_id = @user_id`)
	}
	async getGlobalStats(userId: number) {
		return this.statementGetStats.get(userId) as UserStatsValues;
	}

	getAllElos(): number[] {
		const rows = this.statementGetAllElos.all() as { elo: number }[];
		return rows.map((r) => r.elo);
	}

	get_win_rate(wins: number, losses: number, n: number)
	{
		if (n == 0)
			return (null);
		if (wins == 0)
			return (0);
		if (losses == 0 && wins != 0)
			return (100); 
		if (losses == 0 && wins == 0)
			return (null)
		return (wins / n * 100);
	}

	registerUser(userId: number)
	{
		this.statementRegisterUser.run({ user_id: userId });
	}

	updateUserName(userId: number, username: string) {
		this.statementChangeUsername.run({
			username: username,
			user_id: userId
		});
	}

	updateStats(current: UserStatsValues, match: any): UserStatsValues {
		const n = current.total_games + 1;
		let newWins: number = 0
		if (current.user_id == match.winner_id)
			newWins = 1
		//const newWins = current.wins + (match.win ? 1 : 0);
		const newLosses = current.losses + (match.loss ? 1 : 0);
		const newTournament = current.tournament_played + (match.game_type == "tournament" ? 1 : 0 && match.loss ? 1 : 0);

		console.log("new T = ", newTournament);
		console.log("new win = ", match.win ? 1 : 0)
		console.log("winner = ", match.winner_id)
		console.log("is t= ", match.game_type);
		console.log("is defeat", match.loss ? 1 : 0)
		const newTournamentWin = current.tournament_won + (match.game_type == "tournament" ? 1 : 0 && match.win ? 1 : 0 && match.is_final ? 1 : 0);
		return {
			user_id: current.user_id,
			elo: current.elo + match.elo_gain,
			total_games: n,
			wins: newWins,
			losses: newLosses,
			winrate: this.get_win_rate(newWins, newLosses, n),
			tournament_played: newTournament,
			tournament_won: newTournamentWin,
			average_score: Math.round((current.average_score * current.total_games + match.score) / n),
			average_game_duration_in_seconde: Math.round(
				(current.average_game_duration_in_seconde * current.total_games + match.duration) / n,
			),
		};
	}

	updateUserGlobalStats(userId: number, matchData: any) {
		const current = (this.statementGetStats.get(userId) as UserStatsValues) || {
			user_id: userId,
			elo: 1000,
			total_games: 0,
			wins: 0,
			losses: 0,
			winrate: 0,
			tournament_played: 0,
			tournament_won: 0,
			average_score: 0,
			average_game_duration_in_seconde: 0,
		};
		const nextStats = this.updateStats(current, matchData);
		return this.statementUserStats.run(nextStats);
	}
}