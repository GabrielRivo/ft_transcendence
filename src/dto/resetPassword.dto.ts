import { generateSchema, IsEmail, IsRequired, IsString, MinLength, MaxLength } from 'my-class-validator';

export class ResetPasswordDto {
	@IsRequired()
	@IsString()
	@IsEmail()
	email!: string;

	@IsRequired()
	@IsString()
	@MinLength(6)
	@MaxLength(6)
	otp!: string;

	@IsRequired()
	@IsString()
	@MinLength(8)
	newPassword!: string;
}

export const ResetPasswordSchema = generateSchema(ResetPasswordDto);
