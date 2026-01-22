import { generateSchema, IsBoolean, IsNumber, IsRequired, IsString, Minimum } from 'my-class-validator';

export class CreateUserHistoryDto {
	@IsRequired({ message: 'game id is requiered' })
	@IsNumber()
	@Minimum(0, {message : 'negative scores id'})
	game_id: number;

	@IsRequired({ message: 'player 1 id is requiered' })
	@IsNumber()
	@Minimum(1, {message : 'invalid id for player 1'})
	player1_id: number;

	@IsRequired({ message: 'player 2 id is requiered' })
	@IsNumber()
	@Minimum(1, {message : 'invalid id for player 1'})
	player2_id: number;

	@IsRequired({ message: 'score player 1 is requiered' })
	@IsNumber()
	@Minimum(0, {message : 'negative scores for player 1'})
	score_player1: number;

	@IsRequired({ message: 'score player 2 is requiered' })
	@IsNumber()
	@Minimum(0, {message : 'negative scores for player 2'})
	score_player2: number;

	@IsRequired({ message: 'hit player 2 is requiered' })
	@IsNumber()
	@Minimum(0, {message : 'negative hiy for player 2'})
	hit_player1: number;

	@IsRequired({ message: 'hit player 2 is requiered' })
	@IsNumber()
	@Minimum(0, {message : 'negative hiy for player 2'})
	hit_player2: number;

	@IsRequired({ message: 'winner id is requiered' })
	@IsNumber()
	@Minimum(1, {message : 'invalid id for winner'})
	winner_id: number;

	@IsRequired({ message: 'game duration is requiered' })
	@IsNumber()
	@Minimum(0, {message : 'negative duration'})
	duration_seconds: number;

	@IsRequired({ message: 'ranked or tournament is requiered' })
	@IsString()
	game_type: string;

	@IsNumber({ message: 'need a number' })
	@Minimum(0, {message : 'negative id'})
	tournament_id?: number | null;

	@IsBoolean({ message: 'need a boolean' })
	is_final?: boolean;
}

export const CreateUserHistorySchema = generateSchema(CreateUserHistoryDto);
