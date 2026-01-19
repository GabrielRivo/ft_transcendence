import { IsRequired, IsInt, IsNullable, IsString, generateSchema } from 'my-class-validator';

export class LaunchMatchDto {
    /** ID du match dans le bracket */
    @IsRequired()
    @IsInt()
    matchId!: number;

    /** Secret admin pour les tournois créés par un invité */
    @IsNullable(true)
    @IsString()
    adminSecret?: string;
}

export const LaunchMatchSchema = generateSchema(LaunchMatchDto);
