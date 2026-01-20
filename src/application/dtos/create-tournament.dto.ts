import { IsEnum, IsRequired, IsString, MaxLength, MinLength } from "my-class-validator";
import { TOURNAMENT_SIZES, type TournamentSize } from "../../domain/entities/tournament.js";

export class CreateTournamentDto {
    @IsString()
    @IsRequired()
    @MinLength(3)
    @MaxLength(50)
    name!: string;

    @IsRequired()
    @IsEnum(TOURNAMENT_SIZES, { message: 'Size must be 4, 8 or 16'})
    size!: TournamentSize;
}
