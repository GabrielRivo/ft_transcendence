import { IsString, IsRequired, generateSchema } from 'my-class-validator';

export class CreateGameDto {
  @IsString({ message: "Le nom doit être une chaîne de caractères" })
  @IsRequired()
  player1Id: string;

  @IsString({ message: "Le nom doit être une chaîne de caractères" })
  @IsRequired()
  player2Id: string;
  @IsString({ message: "L'ID du jeu doit être un entier" })
  @IsRequired()
  gameId: string;
}

export const CreateGameSchema = generateSchema(CreateGameDto);