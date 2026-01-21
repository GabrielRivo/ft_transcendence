import { Expose, Type } from 'class-transformer';
import { MatchResponseDto } from './match.response.dto.js';
import { ParticipantResponseDto } from './participant.response.dto.js';
import { type TournamentVisibility } from '@/tournament/domain/entities/tournament.js';
import { type TournamentStatus } from '@/tournament/domain/entities/tournament.js';

export class TournamentResponseDto {
    @Expose()
    id!: string;

    @Expose()
    name!: string;
    
    @Expose()
    size!: number;

    @Expose()
    ownerId!: string;

    @Expose()
    status!: TournamentStatus;

    @Expose()
    visibility!: TournamentVisibility;
    
    @Expose()
    @Type(() => ParticipantResponseDto)
    winner!: ParticipantResponseDto | null;

    @Expose()
    @Type(() => ParticipantResponseDto)
    participants!: ParticipantResponseDto[];

    @Expose()
    @Type(() => MatchResponseDto)
    matches!: MatchResponseDto[];
}
