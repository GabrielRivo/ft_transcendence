import { generateSchema, IsEnum } from "my-class-validator";
import { type TournamentStatus, TOURNAMENT_STATUSES } from "../../domain/entities/tournament.js";

export class ListTournamentsDto {
    @IsEnum(TOURNAMENT_STATUSES, { message: 'Status must be CREATED, STARTED, FINISHED or CANCELED'})
    status?: TournamentStatus;
}

export const ListTournamentsSchema = generateSchema(ListTournamentsDto);