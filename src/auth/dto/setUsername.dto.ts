import {
	AdditionalProperties,
	IsRequired,
	IsString,
	MinLength,
	MaxLength,
	// Pattern,
	generateSchema,
} from 'my-class-validator';

@AdditionalProperties(false)
export class SetUsernameDto {
	@IsRequired()
	@IsString()
	@MinLength(3)
	@MaxLength(20)
	// @Pattern(/^[a-zA-Z0-9_]+$/)
	username: string;
}

export const SetUsernameSchema = generateSchema(SetUsernameDto);

