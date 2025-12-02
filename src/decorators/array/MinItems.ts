import { createConstraintDecorator } from '../factory.js';

export const MinItems = createConstraintDecorator<number>(
	'minItems',
	['array'],
	(value) => `The property must have at least ${value} items.`,
);
