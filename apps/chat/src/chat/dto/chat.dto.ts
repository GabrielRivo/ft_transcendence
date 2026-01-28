import { AdditionalProperties, generateSchema, IsRequired, IsString, MinLength, MaxLength } from "my-class-validator";

@AdditionalProperties(false)
export class ChatDto {
	@IsRequired()
	@IsString()
	@MinLength(1)
	@MaxLength(500)
	content: string;

	@IsRequired()
	@IsString()
	roomId: string;
}

export const ChatSchema = generateSchema(ChatDto);
