import { createConstraintDecorator } from '../factory.js';

export const MinProperties = createConstraintDecorator<number>(
	'minProperties',
	['object'],
	(value) => `The property must have at least ${value} properties.`,
);
