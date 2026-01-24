export interface UserStats {
	user_id: number;
	elo: number;
	total_games: number;
	wins: number;
	losses: number;
	winrate: number;
	tournament_played: number;
	tournament_won: number;
	average_score: number;
	average_game_duration_in_seconde: number;
}

export interface MatchHistory {
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
	gain_player1: number | null;
	gain_player2: number | null;
	tournament_id: number | null;
	is_final: number;
	created_at: string;
}

export interface TransformedMatch {
	id: number;
	date: string;
	opponent: string;
	myScore: number;
	opponentScore: number;
	isWin: boolean;
	eloChange: number;
	duration: string;
	hits: number;
}

export interface UserInfo {
	id: number;
	username: string;
}
