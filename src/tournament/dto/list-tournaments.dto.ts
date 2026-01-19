import { IsEnum, IsNullable, IsString, IsInt, Minimum, generateSchema } from 'my-class-validator';
import { TOURNAMENT_STATUS, type TournamentStatus } from '../../types.js';

export class ListTournamentsQueryDto {
	@IsNullable(true)
	@IsEnum(TOURNAMENT_STATUS)
	status?: TournamentStatus;

	@IsNullable(true)
	@IsString()
	search?: string;

	@IsNullable(true)
	@IsInt()
	@Minimum(1)
	page?: number;

	@IsNullable(true)
	@IsInt()
	@Minimum(1)
	limit?: number;
}

export const ListTournamentsQuerySchema = generateSchema(ListTournamentsQueryDto);
