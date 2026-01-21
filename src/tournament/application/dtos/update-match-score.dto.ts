import { IsInt, IsRequired, Minimum } from "my-class-validator";

export class UpdateMatchScoreDto {
    @IsInt()
    @IsRequired()
    @Minimum(0)
    scoreA!: number;

    @IsInt()
    @IsRequired()
    @Minimum(0)
    scoreB!: number;
}