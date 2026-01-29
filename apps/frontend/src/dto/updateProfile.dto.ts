import { AdditionalProperties, IsEmail, IsRequired, IsString, MaxLength, MinLength, generateSchema } from "my-class-validator";

@AdditionalProperties(false)
export class ProfileDto {
	@IsString()
	@MaxLength(50)
	@MinLength(3)
	bio!: string;

	@IsString()
	@MaxLength(50)
	@MinLength(3)
	username!: string;

	@IsEmail()
	mail!: string;

	@IsString()
	@MaxLength(100)
	@MinLength(3)
	password !: string;

	@IsString()
	@MinLength(6)
	@MaxLength(6)
	totpCode !: string

	@IsString()
	@MinLength(6)
	@MaxLength(6)
	deleteConfirmText !: string

}

export const ProfileSchema= generateSchema(ProfileDto);