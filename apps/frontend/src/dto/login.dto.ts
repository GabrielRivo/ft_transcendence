import { generateSchema, IsEmail, IsRequired, IsString, MinLength, MaxLength } from 'my-class-validator';

export class LoginDto {
	@IsRequired()
	@IsString()
	@IsEmail()
	@MaxLength(100)
	email!: string;

	@IsRequired()
	@IsString()
	@MinLength(8)
	password!: string;
}

export const LoginSchema = generateSchema(LoginDto);

