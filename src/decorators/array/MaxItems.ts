import { createConstraintDecorator } from '../factory.js';

export const MaxItems = createConstraintDecorator<number>(
	'maxItems',
	['array'],
	(value) => `The property must have at most ${value} items.`,
);
