import Database, { Statement } from 'better-sqlite3';
import { InjectPlugin, InternalServerErrorException, NotFoundException, Service } from 'my-fastify-decorators';

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
	private statementGetUserElo!: Statement<{user_id : number}>;
	private statementGetUserElo!: Statement<{user_id : number}>;
	private statementIsUserExist!: Statement;
	private statementRemoveUserStats!: Statement;


	onModuleInit() {
		this.statementGetStats = this.db.prepare(
			`SELECT * FROM user_stats WHERE user_id = ?`);

		this.statementGetAllElos = this.db.prepare('SELECT elo FROM user_stats WHERE user_id >= 0');

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
		this.statementGetUserElo = this.db.prepare(`SELECT elo FROM user_stats WHERE user_id = @user_id`)
		this.statementGetUserElo = this.db.prepare(`SELECT elo FROM user_stats WHERE user_id = @user_id`)
		this.statementIsUserExist = this.db.prepare(`SELECT 1 FROM user_stats WHERE user_id = ?`)
		this.statementRemoveUserStats = this.db.prepare(`DELETE FROM user_stats WHERE user_id = ?`)
	}
 
	async getGlobalStats(userId: number) {
		try {
		const stats = this.statementGetStats.get(userId) as UserStatsValues | undefined;
		if (!stats) {
			throw new NotFoundException(`User "${userId}" not found`);
		}
		return stats;
	}
		catch (error) {
			if (error instanceof NotFoundException) throw error;
			throw new InternalServerErrorException("Internal Database Error");
		}
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
		let newWins: number = current.wins;
		let newLosses : number = current.losses
		let elog: number = 0;
		let newTournament = 0;
		let newTournamentWin = 0;
		let newscore = 0;
		if (match.game_type == "ranked")
		{
			if (current.user_id == match.player1_id)
			{
				newscore = match.score_player1
				elog = match.gain_player1
			}
			else
			{
				newscore = match.score_player2
				elog = match.gain_player2
			}
			if (elog == null)
				elog = 0
		}
		if (current.user_id == match.winner_id)
		{
			newWins += 1;
			if (match.game_type == "tournament" && match.is_final == true)
			{
				newTournament = 1;
				newTournamentWin = 1;
			}
		}

		if (current.user_id != match.winner_id)
		{
			newLosses += 1;
			if (match.game_type == "tournament")
				newTournament = 1;
		}
		return {
			user_id: current.user_id,
			elo: current.elo + elog,
			total_games: n,
			wins: newWins,
			losses: newLosses,
			winrate: this.get_win_rate(newWins, newLosses, n),
			tournament_played: current.tournament_played + newTournament,
			tournament_won: current.tournament_won + newTournamentWin,
			average_score: Math.round((current.average_score * current.total_games + newscore) / n),
			average_game_duration_in_seconde: Math.round(
				(current.average_game_duration_in_seconde * current.total_games + match.duration_seconds) / n,
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
	async getUserElo(userId: number) {
		try {
			const result =  this.statementGetUserElo.get({
				user_id : userId
			});
			if (!result || result == undefined) {
				throw new NotFoundException('User Id not Found');
			}
			return result;
		}catch(e){
			throw new NotFoundException('User Id not Found');
		}
	}

	getAllElos(): number[] {
		try {
			const rows = this.statementGetAllElos.all() as { elo: number }[];
			if (!rows || rows == undefined) {
				throw new NotFoundException("Can't get the row");
			}
			return rows.map((r) => r.elo);
		}catch(e){
			throw new NotFoundException('No user!');
		}
	}
	isUser(userId: number) {
		if (this.statementIsUserExist.get(userId))
			return true;
		return false;
	}

	removeUserStats(userId: number) {
		this.statementRemoveUserStats.run(userId);
	}
}