import { AdditionalProperties, generateSchema, IsRequired, IsString, MinLength } from "my-class-validator";

@AdditionalProperties(false)
export class InviteByUsernameDto {
	@IsRequired({ message: "Target username is required" })
	@IsString()
	@MinLength(3)
	targetUsername: string;
}

export const InviteByUsernameSchema = generateSchema(InviteByUsernameDto);

