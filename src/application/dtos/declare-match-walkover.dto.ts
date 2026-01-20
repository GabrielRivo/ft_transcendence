import { IsRequired, IsString } from "my-class-validator";

export class DeclareMatchWalkoverDto {
    @IsString()
    @IsRequired()
    winnerId!: string;
}