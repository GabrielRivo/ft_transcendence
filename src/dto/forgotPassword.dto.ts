import { generateSchema, IsEmail, IsRequired, IsString } from 'my-class-validator';

export class ForgotPasswordDto {
	@IsRequired()
	@IsString()
	@IsEmail()
	email!: string;
}

export const ForgotPasswordSchema = generateSchema(ForgotPasswordDto);
