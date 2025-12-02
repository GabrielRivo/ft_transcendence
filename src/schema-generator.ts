import 'reflect-metadata';
import { METADATA_KEYS } from './metadata.keys.js';

export function generateSchema(DtoClass: Function) {
	const validations = Reflect.getMetadata(METADATA_KEYS.validation, DtoClass);
	const additionalPropsOptions = Reflect.getMetadata(METADATA_KEYS.additionalProperties, DtoClass);

	let additionalProperties: boolean | object = true;
	let additionalPropertiesErrorMessage = 'should not have additional properties';

	if (additionalPropsOptions) {
		additionalProperties = additionalPropsOptions.allowed;
		if (additionalPropsOptions.message) {
			additionalPropertiesErrorMessage = additionalPropsOptions.message;
		}
	}

	if (!validations) {
		return {
			type: 'object',
			properties: {},
			required: [],
			additionalProperties,
			errorMessage: {
				additionalProperties: additionalPropertiesErrorMessage,
			},
		};
	}

	const properties: { [key: string]: unknown } = {};
	const required: string[] = [];
	const requiredErrorMessages: { [key: string]: string } = {};

	for (const key in validations) {
		const propValidations = validations[key];
		const { isRequired, requiredMessage, type, constraints, custom, errorMessage, nested } =
			propValidations;

		// --- Handle Nested DTOs ---
		if (nested) {
			const nestedSchema = generateSchema(nested);
			if (nestedSchema) {
				properties[key] = nestedSchema;
			}
			if (isRequired) {
				required.push(key);
				if (requiredMessage) {
					requiredErrorMessages[key] = requiredMessage;
				}
			}
			continue;
		}

		const propSchema: any = {};

		if ((constraints || isRequired) && !type) {
			throw new Error(
				`Property '${key}' has validation decorators (@IsRequired, @Minimum...) but is missing a type decorator (@IsString, @IsNumber...).`,
			);
		}

		if (type) {
			propSchema.type = type;
			if (errorMessage && errorMessage.type) {
				propSchema.errorMessage = { type: errorMessage.type };
			}

			// --- Handle Array Item Types ---
			if ((type === 'array' || type === 'object') && propValidations.itemType) {
				const itemType = propValidations.itemType;
				if (typeof itemType === 'string') {
					if (type === 'array') {
						propSchema.items = { type: itemType };
					}
				} else {
					const nestedSchema = generateSchema(itemType);
					if (nestedSchema) {
						if (type === 'array') {
							propSchema.items = nestedSchema;
						} else {
							Object.assign(propSchema, nestedSchema);
						}
					}
				}
			}
		}

		if (constraints) {
			if (!propSchema.errorMessage) propSchema.errorMessage = {};
			for (const constraint of constraints) {
				if (!constraint.appliesToTypes.includes(type)) {
					throw new Error(
						`Decorator for constraint '@${
							constraint.key
						}' on property '${key}' cannot be used on a property of type '${type}'. Allowed types are: [${constraint.appliesToTypes.join(
							', ',
						)}].`,
					);
				}
				propSchema[constraint.key] = constraint.value;
				propSchema.errorMessage[constraint.key] = constraint.errorMessage;
			}
		}

		if (custom) {
			for (const customKeyword in custom) {
				propSchema[customKeyword] = true;
			}
		}

		properties[key] = propSchema;

		if (isRequired) {
			required.push(key);
			if (requiredMessage) {
				requiredErrorMessages[key] = requiredMessage;
			}
		}
	}

	return {
		type: 'object',
		properties,
		required,
		additionalProperties,
		errorMessage: {
			type: 'should be an object',
			required: requiredErrorMessages,
			additionalProperties: additionalPropertiesErrorMessage,
		},
	};
}
