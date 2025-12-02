import { createCustomValidator } from '../factory.js';

export const IsRange = createCustomValidator<Array<number>>(
	'is-range',
	(value) => {
		if (typeof value !== 'object' || !Array.isArray(value)) return false;
		if (value.length !== 2) return false;
		if (typeof value[0] !== 'number' || typeof value[1] !== 'number') return false;
		if (value[0] >= value[1]) return false;
		return true;
	},
	'The property is not a valid range.',
);
