// import { Expose, Type } from 'class-transformer';
// import { MatchResponseDto } from './match.response.dto.js';
// import { ParticipantResponseDto } from './participant.response.dto.js';
import { type TournamentVisibility } from '@/tournament/domain/entities/tournament.js';
import { type TournamentStatus } from '@/tournament/domain/entities/tournament.js';
import { AdditionalProperties, generateSchema, IsArray, IsEnum, IsNumber, IsObject, IsString } from 'my-class-validator';

@AdditionalProperties(false)
class ParticipantResponseDto {
	@IsString()
	id: string;

	@IsString()
	displayName: string;

	@IsEnum(['USER', 'GUEST'])
	type: 'USER' | 'GUEST';
}

@AdditionalProperties(false)
class MatchResponseDto {
	@IsString()
	id: string;

	@IsNumber()
	round: number;

	@IsNumber()
	position: number;

	@IsString()
	status: string;

	@IsNumber()
	scoreA: number;

	@IsNumber()
	scoreB: number;

	@IsObject({ itemType: ParticipantResponseDto })
	playerA: ParticipantResponseDto;

	@IsObject({ itemType: ParticipantResponseDto })
	playerB: ParticipantResponseDto;

	@IsObject({ itemType: ParticipantResponseDto })
	winner: ParticipantResponseDto;
}

@AdditionalProperties(false)
export class TournamentResponseDto {
    @IsString()
    id: string;

	@IsString()
	name: string;

	@IsNumber()
	size: number;

	@IsString()
	ownerId: string;

	@IsEnum(['CREATED', 'STARTED', 'FINISHED', 'CANCELED'])
	status: TournamentStatus;

	@IsEnum(['PUBLIC', 'PRIVATE'])
	visibility: TournamentVisibility;

	@IsArray({ itemType: ParticipantResponseDto })
	participants: ParticipantResponseDto[];

	@IsArray({ itemType: MatchResponseDto })
	matches: MatchResponseDto[];
}

export const TournamentResponseSchema = generateSchema(TournamentResponseDto);

// export class TournamentResponseDto {
//     @Expose()
//     id!: string;

//     @Expose()
//     name!: string;

//     @Expose()
//     size!: number;

//     @Expose()
//     ownerId!: string;

//     @Expose()
//     status!: TournamentStatus;

//     @Expose()
//     visibility!: TournamentVisibility;

//     @Expose()
//     @Type(() => ParticipantResponseDto)
//     winner!: ParticipantResponseDto | null;

//     @Expose()
//     @Type(() => ParticipantResponseDto)
//     participants!: ParticipantResponseDto[];

//     @Expose()
//     @Type(() => MatchResponseDto)
//     matches!: MatchResponseDto[];
// }



