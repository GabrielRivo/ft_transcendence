import { createConstraintDecorator } from '../factory.js';

export const ExclusiveMinimum = createConstraintDecorator<number>(
	'exclusiveMinimum',
	['number', 'integer'],
	(value) => `The property must be greater than ${value}.`,
);
