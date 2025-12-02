import { createConstraintDecorator } from '../factory.js';

export const ExclusiveMaximum = createConstraintDecorator<number>(
	'exclusiveMaximum',
	['number', 'integer'],
	(value) => `The property must be less than ${value}.`,
);
