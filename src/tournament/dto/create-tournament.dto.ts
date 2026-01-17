import { IsString, IsRequired, IsEnum, IsInt, MinLength, MaxLength, generateSchema } from 'my-class-validator';
import { START_MODES, TOURNAMENT_SIZES } from '../../types.js';
import type { StartMode, TournamentSize } from '../../types.js';

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

    @IsRequired()
    @IsEnum(START_MODES)
    startMode!: StartMode;
}

export const CreateTournamentSchema = generateSchema(CreateTournamentDto);
