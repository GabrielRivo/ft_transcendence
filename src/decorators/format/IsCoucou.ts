import { createCustomValidator } from '../factory.js';

export const IsCoucou = createCustomValidator<string>(
	'is-coucou',
	(value) => typeof value === 'string' && value === 'coucou',
	`The property is not a valid coucou.`,
);

// https://ajv.js.org/json-schema.html#metadata-keywords
