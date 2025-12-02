import { createConstraintDecorator } from '../factory.js';

export const Minimum = createConstraintDecorator<number>(
	'minimum',
	['number', 'integer'], // <-- Accepte maintenant les deux types
	(value) => `The property must be at least ${value}.`,
);
