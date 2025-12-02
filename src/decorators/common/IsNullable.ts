import { createConstraintDecorator } from '../factory.js';

export const IsNullable = createConstraintDecorator<boolean>(
	'nullable',
	['string'],
	(value) => `The property must be nullable [${value}].`,
);
