import { IsRequired, IsString, MinLength, MaxLength } from "my-class-validator";

export class JoinGuestTournamentDto {
    @IsString()
    @IsRequired()
    @MinLength(6)
    @MaxLength(6)
    otp!: string;
}
