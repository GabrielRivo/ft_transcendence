import { generateSchema, IsBoolean, IsNumber, IsRequired, IsString, Minimum, Maximum} from 'my-class-validator';

export class CreateUserHistoryDto {
	@IsRequired({ message: 'game id is requiered' })
	@IsString()
	game_id: string;

	// @IsRequired({ message: 'elo player 1 is requiered' })
	// @IsNumber()
	// @Minimum(0, {message : 'negative elo'})
	// player1_elo: number;

	// @IsRequired({ message: 'elo player 2 is requiered' })
	// @IsNumber()
	// @Minimum(0, {message : 'negative elo'})
	// player2_elo: number;

	@IsNumber()
	@IsRequired({ message: 'player 1 id is requiered' })
	player1_id: number;

	@IsNumber()
	@IsRequired({ message: 'player 2 id is requiered' })
	player2_id: number;

	@IsRequired({ message: 'score player 1 is requiered' })
	@IsNumber()
	@Minimum(0, {message : 'negative score for player 1'})
	@Maximum(5, {message : 'invalid score for player 1'})
	score_player1: number;

	@IsRequired({ message: 'score player 2 is requiered' })
	@IsNumber()
	@Minimum(0, {message : 'negative score for player 2'})
	@Maximum(5, {message : 'invalid score for player 2'})
	score_player2: number;

	@IsRequired({ message: 'hit player 2 is requiered' })
	@IsNumber()
	@Minimum(0, {message : 'negative hiy for player 2'})
	hit_player1: number;

	@IsRequired({ message: 'hit player 2 is requiered' })
	@IsNumber()
	@Minimum(0, {message : 'negative hiy for player 2'})
	hit_player2: number;

	@IsNumber()
	@IsRequired({ message: 'winner id is requiered' })
	winner_id: number;

	@IsRequired({ message: 'game duration is requiered' })
	@IsNumber()
	@Minimum(0, {message : 'negative duration'})
	duration_seconds: number;

	@IsRequired({ message: 'ranked or tournament is requiered' })
	@IsString()
	game_type: string;

	@IsNumber({ message: 'need the value for 1' })
	gain_player1: number;

	@IsNumber({ message: 'need the value for 2' })
	gain_player2: number;

	@IsNumber({ message: 'need a number' })
	@Minimum(0, {message : 'negative id'})
	tournament_id?: number | null;

	@IsBoolean({ message: 'need a boolean' })
	is_final?: boolean;
}

export const CreateUserHistorySchema = generateSchema(CreateUserHistoryDto);
