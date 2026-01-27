import { AdditionalProperties, IsNullable, IsRequired, IsString, IsNumber, generateSchema } from "my-class-validator";

@AdditionalProperties(false)
export class ReadProfileDtoResponse {
	@IsRequired()
	@IsString()
	username : string;

    @IsRequired()
    @IsNumber()
    id : number;

    @IsRequired()
    @IsString()
    @IsNullable(true)
    avatar : string | null; // link to the avatar (self hosted or external)

    @IsRequired()
    @IsString()
    bio : string;
}

export const ReadProfileDtoSchemaResponse = generateSchema(ReadProfileDtoResponse);