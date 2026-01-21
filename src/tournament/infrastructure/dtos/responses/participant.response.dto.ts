import { Expose } from 'class-transformer';

export class ParticipantResponseDto {
    @Expose()
    id!: string;

    @Expose()
    displayName!: string;

    @Expose()
    type!: 'USER' | 'GUEST';
}