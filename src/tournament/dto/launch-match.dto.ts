import { IsRequired, IsInt, generateSchema } from 'my-class-validator';

export class LaunchMatchDto {
    /** ID du match dans le bracket */
    @IsRequired()
    @IsInt()
    matchId!: number;
}

export const LaunchMatchSchema = generateSchema(LaunchMatchDto);
