import { IsRequired, IsString, IsArray, IsNullable, generateSchema } from 'my-class-validator';

export class ProcessMatchResultDto {
    /** ID du game (fourni par le service matchmaking) */
    @IsRequired()
    @IsString()
    gameId!: string;

    /** ID du participant vainqueur */
    @IsRequired()
    @IsString()
    winnerId!: string;

    /** Score final [scorePlayer1, scorePlayer2] */
    @IsRequired()
    @IsArray()
    score!: [number, number];

    /** Secret admin pour les tournois créés par un invité */
    @IsNullable(true)
    @IsString()
    adminSecret?: string;
}

export const ProcessMatchResultSchema = generateSchema(ProcessMatchResultDto);
