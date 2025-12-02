import { createConstraintDecorator } from '../factory.js';

export const MaxLength = createConstraintDecorator<number>(
	'maxLength',
	['string'],
	(value) => `The property must be at most ${value} characters long.`,
);
