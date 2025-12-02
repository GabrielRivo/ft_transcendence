import { createConstraintDecorator } from '../factory.js';

export const Maximum = createConstraintDecorator<number>(
	'maximum',
	['number', 'integer'],
	(value) => `The property must be at most ${value}.`,
);
