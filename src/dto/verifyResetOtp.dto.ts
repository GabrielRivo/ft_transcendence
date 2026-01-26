import { generateSchema, IsEmail, IsRequired, IsString, MinLength, MaxLength } from 'my-class-validator';

export class VerifyResetOtpDto {
	@IsRequired()
	@IsString()
	@IsEmail()
	email!: string;

	@IsRequired()
	@IsString()
	@MinLength(6)
	@MaxLength(6)
	otp!: string;
}

export const VerifyResetOtpSchema = generateSchema(VerifyResetOtpDto);
