import type { Ajv } from 'ajv';
import { customValidatorRegistry } from './decorators/factory.js';

export function registerValidators(ajv: Ajv) {
	for (const [keyword, validator] of customValidatorRegistry.entries()) {
		if ((ajv as any).getKeyword && (ajv as any).getKeyword(keyword)) continue;

		const userValidate = validator.validate;
		const isAsync = userValidate.constructor.name === 'AsyncFunction';

		(ajv as any).addKeyword({
			keyword: validator.keyword,
			validate: isAsync
				? async function (_schema: unknown, data: unknown) {
						return await (userValidate as any)(data);
					}
				: function (_schema: unknown, data: unknown) {
						return (userValidate as any)(data);
					},
			async: isAsync,
		});
	}
}
