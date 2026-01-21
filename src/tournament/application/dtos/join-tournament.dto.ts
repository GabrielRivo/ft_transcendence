import { IsRequired, IsString, MaxLength, MinLength } from "my-class-validator";

export class JoinTournamentDto {
    @IsString()
    @IsRequired()
    @MinLength(1)
    @MaxLength(20, { message: 'Display name is too long (max 20 chars)' })
    displayName!: string;
}