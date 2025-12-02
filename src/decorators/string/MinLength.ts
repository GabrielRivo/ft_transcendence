import 'reflect-metadata';
import { createConstraintDecorator } from '../factory.js';

export const MinLength = createConstraintDecorator<number>(
	'minLength',
	['string'],
	(value) => `The property must be at least ${value} characters long.`,
);
