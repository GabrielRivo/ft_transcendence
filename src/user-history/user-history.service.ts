import Database, { Statement } from 'better-sqlite3';
import { BadRequestException, Inject, InjectPlugin, Service } from 'my-fastify-decorators';
import { UserStatsService } from '../user-stats/user-stats.service.js';

const addMatchHistoryStatement: string = 
	`INSERT INTO game_history (game_id, player1_id, player2_id, score_player1,
		score_player2, hit_player1, hit_player2, winner_id, duration_seconds, game_type, 
		gain_player1, gain_player2, tournament_id, is_final)
	VALUES (@game_id, @player1_id, @player2_id, @score_player1,
		@score_player2, @hit_player1, @hit_player2, @winner_id, @duration_seconds, 
		@game_type, @gain_player1, @gain_player2, @tournament_id, @is_final);`;

const getMatchHistory: string = 
	`SELECT * FROM game_history
	WHERE player1_id = ? OR player2_id = ? ORDER BY created_at DESC;`;

const isTournamentExists: string = `SELECT 1 FROM tournament WHERE tournament_id = ?`;

const isGameIdValid: string = `SELECT 1 FROM game_history WHERE game_id = ?`;

const isUserExists: string = `SELECT 1 FROM user_stats WHERE user_id = ?`;

const countRanked : string = `SELECT count(*) FROM game_history
	WHERE (player1_id = @userId OR player2_id = @userId) AND game_type='ranked'`;

const updateTournamentWinner = `UPDATE tournament SET winner_id = ?, status = 'completed' WHERE tournament_id = ?;`;


@Service()
export class UserHistoryService {
	@InjectPlugin('db')
	private db!: Database.Database;

	@Inject(UserStatsService)
	private userStatsService!: UserStatsService;

	private statementAddMatchtoHistory: Statement<{
		game_id: string;
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
		gain_player1: number | null;
    	gain_player2: number | null; 
		is_final: boolean;
	}>;

	private statementGet!: Statement<[number, number]>;
	private statementisGameIdValid!: Statement;
	private statementIsUserExists!: Statement;
	private statementIsTournamentExists!: Statement;
	private statementMatchTransaction!: (match: any, p1: any, p2: any, isFinal: any) => void;
	private statementGetRankedNumber!: Statement<{userId: number}>;

	onModuleInit() {
		this.statementAddMatchtoHistory = this.db.prepare(addMatchHistoryStatement);
		this.statementGet = this.db.prepare(getMatchHistory);
		this.statementisGameIdValid = this.db.prepare(isGameIdValid);
		this.statementIsUserExists = this.db.prepare(isUserExists);
		this.statementIsTournamentExists = this.db.prepare(isTournamentExists);
		this.statementGetRankedNumber = this.db.prepare(countRanked);

		this.statementMatchTransaction = this.db.transaction((match, p1, p2, isFinal) => {
			this.statementAddMatchtoHistory.run(match);
			this.userStatsService.updateUserGlobalStats(p1.user_id, p1);
			this.userStatsService.updateUserGlobalStats(p2.user_id, p2);
			if (isFinal && match.tournament_id) {
				this.db.prepare(updateTournamentWinner).run(match.winner_id, match.tournament_id);
			}
		});
	}

	async add_match_to_history(
		game_id: string,
		player1_id: number,
		player2_id: number,
		score_player1: number,
		score_player2: number,
		hit_player1: number,
		hit_player2: number,
		gain_player1: number | null,
		gain_player2: number | null,
		winner_id: number,
		duration_seconds: number,
		game_type: string,
		tournament_id: number | null = null,
		is_final: boolean = false,
	){

		if (winner_id == -1) {
			console.error('[AddHistory', 'Cancelled Game')
			return ;
		}
		if (player1_id === player2_id) {
			console.error('[AddHistory', 'Same ids')
			return ;
		}
		if (score_player1 < 0 || score_player2 < 0) {
			console.error('[AddHistory', 'Score < 0')
			return ;
			throw new BadRequestException();
		}
		if (winner_id != player1_id && winner_id != player2_id) {
			console.error('[AddHistory', 'winner id doesn\'t match players id')
			return ;
			throw new BadRequestException("winner id doesn't match players id");
		}
		if (duration_seconds < 0) {
			console.error('[AddHistory', 'Duration < 0')
			return ;
			throw new BadRequestException();
		}
		const allowedTypes = ['tournament', 'ranked'];
		if (!allowedTypes.includes(game_type)) {
			console.error('[AddHistory', `Invalid game_type: ${game_type}. Must be 'tournament' or 'ranked'`)
			return ;
			throw new BadRequestException(`Invalid game_type: ${game_type}. Must be 'tournament' or 'ranked'`);
		}

		const exists = this.statementisGameIdValid.get(game_id);
		if (exists) {
			console.error('[AddHistory', `Match ${game_id} already exist`)
			return ;
			throw new BadRequestException(`Match ${game_id} already exist`);
		}
		if (game_type === 'tournament' && (!tournament_id || tournament_id <= 0)) {
			console.error('[AddHistory', "Tournament need a tournament id")
			return ;
			throw new BadRequestException("Tournament need a tournament id");
		}
		if (game_type === 'ranked' && tournament_id && tournament_id > 0) {
			console.error('[AddHistory', "Ranked can't have tournament id")
			return ;
			throw new BadRequestException("Ranked can't have tournament id");
		}
		if (game_type === 'ranked' && is_final) {
			console.error('[AddHistory', "Ranked can't have final")
			return ;
			throw new BadRequestException("Ranked can't have final");
		}
		if (game_type === 'ranked' && (gain_player1 == null || gain_player2 == null)) {
			console.error('[AddHistory', "Ranked needs gain value")
			return ;
			throw new BadRequestException("Ranked needs gain value");
		}
		if (game_type != 'ranked' && (gain_player1 != null || gain_player2 != null)) {
			console.error('[AddHistory', "Only ranked can modify the elo")
			return ;
			throw new BadRequestException("Only ranked can modify the elo");
		}
		const player1Exists = this.statementIsUserExists.get(player1_id);
		
		if (!player1Exists) {
			console.error('[AddHistory', `Player ${player1_id} doesn't exist`)
			return ;
			throw new BadRequestException(`Player ${player1_id} doesn't exist`);
		}
		const player2Exists = this.statementIsUserExists.get(player2_id);
		if (!player2Exists) {
			console.error('[AddHistory', `Player ${player2_id} doesn't exist`)
			return ;
			throw new BadRequestException(`Player ${player2_id} doesn't exist`);
		}
		const finalStatus = game_type === 'ranked' ? false : is_final;
		const safeTournamentId = (tournament_id && tournament_id > 0) ? tournament_id : null;

		if (safeTournamentId) {
			const tExists = this.statementIsTournamentExists.get(safeTournamentId);
			if (!tExists) {
				console.error('[AddHistory', `Tournament ${safeTournamentId} does not exist`)
				return ;
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
			score: score_player1,
			win: winner_id === player1_id,
			loss: winner_id !== player1_id,
			elo_gain: gain_player1,
			duration: duration_seconds,
			isTournament: is_new_T_p1,
			wonTournament: is_final && winner_id === player1_id,
		};
		const p2Stats = {
			user_id: player2_id,
			score: score_player2,
			win: winner_id === player2_id,
			loss: winner_id !== player2_id,
			elo_gain: gain_player2,
			duration: duration_seconds,
			isTournament: is_new_T_p2,
			wonTournament: is_final && winner_id === player2_id,
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
			gain_player1,
			gain_player2,
			tournament_id,
			is_final: finalStatus ? 1 : 0,
		};

		this.statementMatchTransaction(matchData, p1Stats, p2Stats, is_final)
		// return (
		// 	{ message: 'Match registered' }
		// );
	}

	get_user_matches(userId: number) {
		try {
			return this.statementGet.all(userId, userId);
		} catch (error) {
			console.error('ERREUR SQLITE :', error);
			throw error;
		}
	}
	async get_ranked_number(userId: number){
		const row = this.statementGetRankedNumber.get({ userId }) as { count: number } | undefined;
		return row?.count ?? 0;
	}
	
	async calcElo(player_id: number, opponent_id: number, score_player1: number, score_player2: number)
	{
		const p1Stats = await this.userStatsService.getGlobalStats(player_id);
		const p2Stats = await this.userStatsService.getGlobalStats(opponent_id);
		const nb = await this.get_ranked_number(player_id);
		let kfactor 
		if (nb >= 10)
			kfactor = 80;
		else if (p1Stats.elo > 1400)
			kfactor = 20;
		else
			kfactor = 50;
		const diffScore = score_player1 - score_player2;
		const diffElo = p2Stats.elo - p1Stats.elo;
		const hope = 1 / (1 + Math.pow(10, diffElo / 400));
		const newElo = p1Stats.elo + kfactor * (( 0.5 + diffScore / 10)- hope);
		const res = newElo - p1Stats.elo
		return Math.round(res);
	}
}
