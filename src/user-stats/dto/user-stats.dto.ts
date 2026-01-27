import { generateSchema, IsNumber, IsRequired, IsString } from 'my-class-validator';

export class CreateGameStatDto {
	@IsRequired({ message: 'game id is requiered' })
	@IsString()
	game_id: string;

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
	score_player2: string;

	@IsRequired({ message: 'number hit player 1 is requiered' })
	@IsNumber()
	hit_player1: number;

	@IsRequired({ message: 'number hit player 2 is requiered' })
	@IsNumber()
	hit_player2: number;

	@IsRequired({ message: 'winner id is requiered' })
	@IsNumber()
	winner_id: number;

	@IsRequired({ message: 'game duration is requiered' })
	@IsNumber()
	duration_seconds: number;

	@IsRequired({ message: 'ranked or tournament is requiered' })
	@IsString()
	game_type: string;
}
export const CreateGameStatSchema = generateSchema(CreateGameStatDto);
