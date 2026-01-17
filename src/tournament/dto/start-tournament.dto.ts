import { IsNullable, IsString, generateSchema } from 'my-class-validator';

export class StartTournamentDto {
    /** Secret admin pour les tournois créés par des invités */
    @IsNullable(true)
    @IsString()
    adminSecret?: string;
}

export const StartTournamentSchema = generateSchema(StartTournamentDto);
