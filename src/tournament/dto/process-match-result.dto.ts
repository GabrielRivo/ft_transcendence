import { IsRequired, IsString, IsArray, generateSchema } from 'my-class-validator';

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
}

export const ProcessMatchResultSchema = generateSchema(ProcessMatchResultDto);
