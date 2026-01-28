import { AdditionalProperties, generateSchema, IsInt, IsRequired, IsString, MinLength } from "my-class-validator";

@AdditionalProperties(false)
export class InviteByUsernameDto {
	@IsRequired({ message: "User ID is required" })
	@IsInt()
	userId: number;

	@IsRequired({ message: "Sender username is required" })
	@IsString()
	senderUsername: string;

	@IsRequired({ message: "Target username is required" })
	@IsString()
	@MinLength(1)
	targetUsername: string;
}

export const InviteByUsernameSchema = generateSchema(InviteByUsernameDto);

