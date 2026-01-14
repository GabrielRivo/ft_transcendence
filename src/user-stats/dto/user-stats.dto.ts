import { generateSchema, IsNumber, IsRequired, IsString } from 'my-class-validator';

export class CreateGameStatDto {
	@IsRequired({ message: 'game id is requiered' })
	@IsNumber()
	game_id: number;

	@IsRequired({ message: 'player 1 id is requiered' })
	@IsNumber()
	player1_id: number;

	@IsRequired({ message: 'player 2 id is requiered' })
	@IsNumber()
	player2_id: number;

	@IsRequired({ message: 'score player 1 is requiered' })
	@IsNumber()
	score_player1: number;

	@IsRequired({ message: 'score player 2 is requiered' })
	@IsNumber()
	score_player2: number;

	@IsRequired({ message: 'winner id is requiered' })
	@IsNumber()
	winner_id: number;

	@IsRequired({ message: 'game duration is requiered' })
	@IsNumber()
	duration_seconds: number;

	@IsRequired({ message: 'ranked or tournament is requiered' })
	@IsString()
	game_type: string;

	// @IsRequired({ message: "Send -1 if no tournament" })
	// @IsNumber({ message : "need a number" })
	// tournament_id: number

	// @IsBoolean({ message : "need a boolean" })
	// is_final?: boolean;
}
export const CreateGameStatSchema = generateSchema(CreateGameStatDto);
