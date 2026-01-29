import Database, { Statement } from 'better-sqlite3';
import { Inject, InjectPlugin, InternalServerErrorException, NotFoundException, Service } from 'my-fastify-decorators';
import { UserStatsService } from '../user-stats/user-stats.service.js';

const addMatchHistoryStatement: string = 
	`INSERT INTO game_history (game_id, player1_id, player2_id, score_player1,
		score_player2, hit_player1, hit_player2, winner_id, duration_seconds, game_type, 
		gain_player1, gain_player2, is_final)
	VALUES (@game_id, @player1_id, @player2_id, @score_player1,
		@score_player2, @hit_player1, @hit_player2, @winner_id, @duration_seconds, 
		@game_type, @gain_player1, @gain_player2, @is_final);`;

const getMatchHistory: string = 
	`SELECT * FROM game_history
	WHERE player1_id = ? OR player2_id = ? ORDER BY created_at DESC;`;

const isGameIdValid: string = `SELECT 1 FROM game_history WHERE game_id = ?`;

const isUserExists: string = `SELECT 1 FROM user_stats WHERE user_id = ?`;

const countRanked : string = `SELECT count(*) FROM game_history
	WHERE (player1_id = @userId OR player2_id = @userId) AND game_type='ranked'`;


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
		gain_player1: number | null;
    	gain_player2: number | null; 
		is_final: boolean;
	}>;

	private statementGet!: Statement<[number, number]>;
	private statementisGameIdValid!: Statement;
	private statementIsUserExists!: Statement;
	private statementMatchTransaction!: (match: any, p1: any, p2: any, isFinal: any) => void;
	private statementGetRankedNumber!: Statement<{userId: number}>;

	onModuleInit() {
		this.statementAddMatchtoHistory = this.db.prepare(addMatchHistoryStatement);
		this.statementGet = this.db.prepare(getMatchHistory);
		this.statementisGameIdValid = this.db.prepare(isGameIdValid);
		this.statementIsUserExists = this.db.prepare(isUserExists);
		this.statementGetRankedNumber = this.db.prepare(countRanked);


		this.statementMatchTransaction = this.db.transaction((match, p1, p2) => {
			this.statementAddMatchtoHistory.run(match);
			this.userStatsService.updateUserGlobalStats(p1.user_id, match);
			this.userStatsService.updateUserGlobalStats(p2.user_id, match);
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
		is_final: boolean = false,
	){

		if (winner_id == -1 || player1_id == player2_id || score_player1 < 0 || score_player2 < 0) {
			return ;
		}

		if (winner_id != player1_id && winner_id != player2_id) {
			return ;
		}
		if (duration_seconds < 0) {
			return ;
		}
		const allowedTypes = ['tournament', 'ranked'];
		if (!allowedTypes.includes(game_type)) {
			return ;
		}

		const exists = this.statementisGameIdValid.get(game_id);
		if (exists) {
			return ;
		}
		if (game_type === 'ranked' && is_final) {
			return ;
		}
		if (game_type === 'ranked' && (gain_player1 == null || gain_player2 == null)) {
			return ;
		}
		if (game_type != 'ranked' && (gain_player1 != null || gain_player2 != null)) {
			return ;
		}
		const player1Exists = this.statementIsUserExists.get(player1_id);
		
		if (!player1Exists) {
			return ;
		}
		const player2Exists = this.statementIsUserExists.get(player2_id);
		if (!player2Exists) {
			return ;
		}
		const finalStatus = game_type === 'ranked' ? false : is_final;
	
		const p1Stats = {
			user_id: player1_id,
			score: score_player1,
			win: winner_id === player1_id,
			loss: winner_id !== player1_id,
			elo_gain: gain_player1 ?? 0,
			duration: duration_seconds / 60,
			wonTournament: is_final && winner_id === player1_id,
		};
		const p2Stats = {
			user_id: player2_id,
			score: score_player2,
			win: winner_id === player2_id,
			loss: winner_id !== player2_id,
			elo_gain: gain_player2 ?? 0,
			duration: duration_seconds / 60,
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
			duration_seconds: duration_seconds /60,
			game_type,
			gain_player1,
			gain_player2,
			is_final: finalStatus ? 1 : 0,
		};

		this.statementMatchTransaction(matchData, p1Stats, p2Stats, is_final)
	}

	get_user_matches(userId: number) {
		try {
			return this.statementGet.all(userId, userId);
		} catch (error) {
			if (error instanceof NotFoundException) throw error;
			throw new InternalServerErrorException("Internal Database Error");
		}
	}
	async get_ranked_number(userId: number){
		const row = this.statementGetRankedNumber.get({ userId }) as { count: number } | undefined;
		return row?.count ?? 0;
	}

	checkLeaver(score1: number, score2: number)
	{
		if (score1 == score2)
			return true
		if (score1 != 5 && score2 != 5)
			return true
		return false
	}
	
	async calcElo(player_id: number, opponent_id: number, score_player1: number, score_player2: number, winner_id: number)
	{
		if (this.checkLeaver(score_player1, score_player2) == true)
		{
			if (winner_id == player_id)
				return (6)
			else 
				return (-20) 
		}
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
		let result = Math.round(res)
		if (result == 0)
		{
			if (winner_id == player_id)
				result = 1
			else 
				result = -1
		} 
		return result;
	}
}
