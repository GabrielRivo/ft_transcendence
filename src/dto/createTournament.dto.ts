import { generateSchema, IsEnum, IsRequired, IsString, MaxLength, MinLength } from 'my-class-validator';

export const TOURNAMENT_SIZES = [4, 8, 16] as const;
export type TournamentSize = (typeof TOURNAMENT_SIZES)[number];

export const TOURNAMENT_VISIBILITIES = ['PUBLIC', 'PRIVATE'] as const;
export type TournamentVisibility = (typeof TOURNAMENT_VISIBILITIES)[number];

export class CreateTournamentDto {
	@IsString()
	@IsRequired()
	@MinLength(3)
	@MaxLength(50)
	name!: string;

	@IsRequired()
	@IsEnum(TOURNAMENT_SIZES, { message: 'Size must be 4, 8 or 16' })
	size!: TournamentSize;

	@IsRequired()
	@IsEnum(TOURNAMENT_VISIBILITIES, { message: 'Visibility must be PUBLIC or PRIVATE' })
	visibility!: TournamentVisibility;
}

export const CreateTournamentSchema = generateSchema(CreateTournamentDto);
