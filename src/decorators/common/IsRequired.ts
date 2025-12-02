import 'reflect-metadata';
import { METADATA_KEYS } from '../../metadata.keys.js';

export function IsRequired(options?: { message?: string }): PropertyDecorator {
	return (target: object, propertyKey: string | symbol) => {
		const validations = Reflect.getMetadata(METADATA_KEYS.validation, target.constructor) || {};

		if (!validations[propertyKey]) {
			validations[propertyKey] = {};
		}

		validations[propertyKey].isRequired = true;
		if (options?.message) {
			validations[propertyKey].requiredMessage = options.message;
		}

		Reflect.defineMetadata(METADATA_KEYS.validation, validations, target.constructor);
	};
}
