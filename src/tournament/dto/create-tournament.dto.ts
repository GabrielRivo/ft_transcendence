import { IsString, IsRequired, IsEnum, IsInt, MinLength, MaxLength, generateSchema } from 'my-class-validator';
import { TOURNAMENT_SIZES } from '../../types.js';
import type { TournamentSize } from '../../types.js';

export class CreateTournamentDto {
    @IsRequired()
    @IsString()
    @MinLength(3)
    @MaxLength(50)
    name!: string;

    @IsRequired()
    @IsInt()
    @IsEnum(TOURNAMENT_SIZES)
    size!: TournamentSize;
}

export const CreateTournamentSchema = generateSchema(CreateTournamentDto);
