import { createConstraintDecorator } from '../factory.js';

/**
 * Check if all items in the array are unique.
 * @valid: [], [1], ["1", 2, "3"] <br />
 * @invalid: [1, 2, 1], [{a: 1, b: 2}, {b: 2, a: 1}]
 */
export const UniqueItems = createConstraintDecorator<boolean>(
	'uniqueItems',
	['array'],
	(value) => `The property must have unique items [${value}].`,
);
