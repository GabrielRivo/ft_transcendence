import { createConstraintDecorator } from '../factory.js';

export const MaxProperties = createConstraintDecorator<number>(
	'maxProperties',
	['object'],
	(value) => `The property must have at most ${value} properties.`,
);
