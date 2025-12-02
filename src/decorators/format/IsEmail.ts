import { createCustomValidator } from '../factory.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const IsEmail = createCustomValidator<string>(
	'is-email',
	(value) => typeof value === 'string' && emailRegex.test(value),
	'The property is not a valid email address.',
);
