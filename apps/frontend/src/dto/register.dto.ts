import {
	AdditionalProperties,
	IsEmail,
	IsRequired,
	IsString,
	MinLength,
	generateSchema,
	MaxLength,
	createCustomValidator,
} from 'my-class-validator';

const IsStrongPassword = createCustomValidator<string>(
	'isStrongPassword',
	(value: string) => {
		if (typeof value !== 'string') return false;
		const hasUppercase = /[A-Z]/.test(value);
		const hasLowercase = /[a-z]/.test(value);
		const hasNumber = /[0-9]/.test(value);
		const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value);
		return hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
	},
	'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
);

@AdditionalProperties(false)
export class RegisterDto {
	@IsRequired()
	@IsString()
	@IsEmail()
	@MaxLength(100)
	email!: string;

	@IsRequired()
	@IsString()
	@MinLength(8)
	@MaxLength(100)
	@IsStrongPassword()
	password!: string;
}

export const RegisterSchema = generateSchema(RegisterDto);

