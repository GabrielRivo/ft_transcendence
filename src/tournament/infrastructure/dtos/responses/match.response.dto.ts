import { Expose, Type } from 'class-transformer';
import { ParticipantResponseDto } from './participant.response.dto.js';

export class MatchResponseDto {
    @Expose()
    id!: string;

    @Expose()
    round!: number;

    @Expose()
    position!: number;

    @Expose()
    status!: string;

    @Expose()
    scoreA!: number;

    @Expose()
    scoreB!: number;

    @Expose()
    @Type(() => ParticipantResponseDto)
    playerA!: ParticipantResponseDto | null;

    @Expose()
    @Type(() => ParticipantResponseDto)
    playerB!: ParticipantResponseDto | null;

    @Expose()
    @Type(() => ParticipantResponseDto)
    winner!: ParticipantResponseDto | null;
}