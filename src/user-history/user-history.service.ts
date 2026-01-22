import Database, { Statement } from 'better-sqlite3';
import { BadRequestException, InjectPlugin, Service } from 'my-fastify-decorators';

const addMatchHistoryStatement: string = `INSERT INTO game_history (game_id, player1_id, player2_id, score_player1,
												score_player2, hit_player1, hit_player2, winner_id, duration_seconds, game_type, tournament_id, is_final)
										VALUES (@game_id, @player1_id, @player2_id, @score_player1,
												@score_player2, @hit_player1, @hit_player2 @winner_id, @duration_seconds, @game_type, @tournament_id, @is_final);`;

const getMatchHistory: string = `SELECT * FROM game_history
									WHERE player1_id = ? OR player2_id = ? ORDER BY created_at DESC;`;

const updateUserGlobalStats: string = `UPDATE user_stats
										SET average_score = ((average_score * total_games) + @new_score) / (total_games + 1),
										total_games = total_games + 1,wins = wins + @is_win,losses = losses + @is_loss, tournament_played = tournament_played + @is_new_tournament,
										tournament_won = tournament_won + @won_tournament,
										average_game_duration_in_seconde = ((average_game_duration_in_seconde * total_games) + @duration) / (total_games + 1)
										WHERE user_id = @user_id`;

const isTournamentExists: string = `SELECT 1 FROM tournament WHERE tournament_id = ?`;
const isGameIdValid: string = `SELECT 1 FROM game_history WHERE game_id = ?`;
const isUserExists: string = `SELECT 1 FROM user_stats WHERE user_id = ?`;
const updateTournamentWinner = `UPDATE tournament SET winner_id = ?, status = 'completed' WHERE tournament_id = ?;`;

@Service()
export class UserHistoryService {
	@InjectPlugin('db')
	private db!: Database.Database;

	private statementAddMatchtoHistory: Statement<{
		game_id: number;
		player1_id: number;
		player2_id: number;
		score_player1: number;
		score_player2: number;
		hit_player1: number;
		hit_player2: number;
		winner_id: number;
		duration_seconds: number;
		game_type: string;
		tournament_id: number | null;
		is_final: boolean;
	}>;

	private statementGet!: Statement<[number, number]>;
	private statementisGameIdValid!: Statement;
	private statementIsUserExists!: Statement;
	private statementIsTournamentExists!: Statement;
	private runMatchTransaction!: (match: any, p1: any, p2: any, isFinal: any) => void;
	private statementUpdateStats!: Statement;

	onModuleInit() {
		this.statementAddMatchtoHistory = this.db.prepare(addMatchHistoryStatement);
		this.statementGet = this.db.prepare(getMatchHistory);
		this.statementisGameIdValid = this.db.prepare(isGameIdValid);
		this.statementIsUserExists = this.db.prepare(isUserExists);
		this.statementIsTournamentExists = this.db.prepare(isTournamentExists);
		this.statementUpdateStats = this.db.prepare(updateUserGlobalStats);

		this.runMatchTransaction = this.db.transaction((match, p1, p2, isFinal) => {
			this.statementAddMatchtoHistory.run(match);
			this.statementUpdateStats.run(p1);
			this.statementUpdateStats.run(p2);
			if (isFinal && match.tournament_id) {
				this.db.prepare(updateTournamentWinner).run(match.winner_id, match.tournament_id);
			}
		});
	}

	add_match_to_history(
		game_id: number,
		player1_id: number,
		player2_id: number,
		score_player1: number,
		score_player2: number,
		hit_player1: number,
		hit_player2: number,
		winner_id: number,
		duration_seconds: number,
		game_type: string,
		tournament_id: number | null = null,
		is_final: boolean = false,
	){

		if (player1_id === player2_id) {
			throw new BadRequestException('Same ids');
		}
		if (score_player1 < 0 || score_player2 < 0) {
			throw new BadRequestException();
		}
		if (winner_id != player1_id && winner_id != player2_id) {
			throw new BadRequestException("winner id doesn't match players id");
		}
		if (duration_seconds < 0) {
			throw new BadRequestException();
		}
		const allowedTypes = ['tournament', 'ranked'];
		if (!allowedTypes.includes(game_type)) {
			throw new BadRequestException(`Invalid game_type: ${game_type}. Must be 'tournament' or 'ranked'`);
		}

		const exists = this.statementisGameIdValid.get(game_id);
		if (exists) {
			throw new BadRequestException(`Match ${game_id} already exist`);
		}
		if (game_type === 'tournament' && (!tournament_id || tournament_id <= 0)) {
			throw new BadRequestException("Tournament need a tournament id");
		}
		if (game_type === 'ranked' && tournament_id && tournament_id > 0) {
			throw new BadRequestException("Ranked can't have tournament id");
		}
		if (game_type === 'ranked' && is_final) {
			throw new BadRequestException("Ranked can't have final ");
		}

		const player1Exists = this.statementIsUserExists.get(player1_id);
		if (!player1Exists) {
			throw new BadRequestException(`Player ${player1_id} doesn't exist`);
		}
		const player2Exists = this.statementIsUserExists.get(player2_id);
		if (!player2Exists) {
			throw new BadRequestException(`Player ${player2_id} doesn't exist`);
		}
		const finalStatus = game_type === 'ranked' ? false : is_final;
		const safeTournamentId = (tournament_id && tournament_id > 0) ? tournament_id : null;

		if (safeTournamentId) {
			const tExists = this.statementIsTournamentExists.get(safeTournamentId);
			if (!tExists) {
				throw new BadRequestException(`Tournament ${safeTournamentId} does not exist`);
			}
		}
		let is_new_T_p1 = 0;
		let is_new_T_p2 = 0;

		if (safeTournamentId) {
			const tournament_save = this.db.prepare(`INSERT OR IGNORE INTO tournament_players (tournament_id, user_id) VALUES (?, ?)`,);
			is_new_T_p1 = tournament_save.run(safeTournamentId, player1_id).changes;
			is_new_T_p2 = tournament_save.run(safeTournamentId, player2_id).changes;
		}
		const p1Stats = {
			user_id: player1_id,
			new_score: score_player1,
			is_win: winner_id === player1_id ? 1 : 0,
			is_loss: winner_id === player1_id ? 0 : 1,
			duration: duration_seconds,
			is_new_tournament: is_new_T_p1,
			won_tournament: is_final && winner_id === player1_id ? 1 : 0,
		};
		const p2Stats = {
			user_id: player2_id,
			new_score: score_player2,
			is_win: winner_id === player2_id ? 1 : 0,
			is_loss: winner_id === player2_id ? 0 : 1,
			duration: duration_seconds,
			is_new_tournament: is_new_T_p2,
			won_tournament: is_final && winner_id === player2_id ? 1 : 0,
		};

		const matchData = {
			game_id,
			player1_id,
			player2_id,
			score_player1,
			score_player2,
			hit_player1,
			hit_player2,
			winner_id,
			duration_seconds,
			game_type,
			tournament_id,
			is_final: finalStatus ? 1 : 0,
		};

		return (
			this.runMatchTransaction(matchData, p1Stats, p2Stats, is_final),
			{ message: 'Match registered' }
		);
	}

	get_user_matches(userId: number) {
		try {
			return this.statementGet.all(userId, userId);
		} catch (error) {
			console.error('ERREUR SQLITE :', error);
			throw error;
		}
	}
}
