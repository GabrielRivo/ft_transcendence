import { AdditionalProperties, IsRequired, IsString, IsNumber, IsNullable, IsArray, generateSchema } from "my-class-validator";

@AdditionalProperties(false)
export class OnlineUserDto {
	@IsRequired()
	@IsNumber()
	userId: number;

	@IsRequired()
	@IsString()
	username: string;

	@IsRequired()
	@IsString()
	@IsNullable(true)
	avatar: string | null;
}

@AdditionalProperties(false)
export class OnlineUsersDtoResponse {
	@IsRequired()
	@IsArray()
	users: OnlineUserDto[];
}

export const OnlineUsersDtoSchemaResponse = generateSchema(OnlineUsersDtoResponse);
