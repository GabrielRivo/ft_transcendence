import { updateAndSetMetadata } from '../factory.js';

type DecoratorOptions = { message?: string };
type EnumValue = string | number | boolean;
type InferredEnumType = 'string' | 'number' | 'integer' | 'boolean';

/**
 * Validates that the property value is one of the allowed enum values.
 * Works with TypeScript enums, arrays of values, or object enums.
 *
 * @param enumType - A TypeScript enum, an array of allowed values, or an object with enum values
 * @param options - Optional configuration including custom error message
 *
 * @example
 * // With TypeScript enum
 * enum Status { Active = 'active', Inactive = 'inactive' }
 * @IsEnum(Status)
 * status: Status;
 *
 * @example
 * // With array of values
 * @IsEnum(['pending', 'approved', 'rejected'])
 * status: string;
 */
export function IsEnum<T extends object | readonly any[]>(
	enumType: T,
	options?: DecoratorOptions,
): PropertyDecorator {
	return (target: object, propertyKey: string | symbol) => {
		const enumValues = getEnumValues(enumType);
		const inferredType = inferEnumType(enumValues);

		updateAndSetMetadata(target, propertyKey, (propValidations) => {
			propValidations.enum = enumValues;
			if (!propValidations.type && inferredType) {
				propValidations.type = inferredType;
				if (!propValidations.errorMessage) propValidations.errorMessage = {};
				if (!propValidations.errorMessage.type) {
					propValidations.errorMessage.type = getTypeErrorMessage(inferredType);
				}
			}
			if (!propValidations.errorMessage) propValidations.errorMessage = {};
			propValidations.errorMessage.enum =
				options?.message ||
				`The property must be one of the following values: ${enumValues.join(', ')}.`;
		});
	};
}

/**
 * Extracts enum values from various enum-like types
 */
function getEnumValues<T extends object | readonly any[]>(enumType: T): EnumValue[] {
	// If it's an array, return it directly
	if (Array.isArray(enumType)) {
		return enumType;
	}

	// For TypeScript enums (which are objects)
	const values: EnumValue[] = [];

	for (const key of Object.keys(enumType)) {
		const value = (enumType as Record<string, unknown>)[key];
		// TypeScript numeric enums have reverse mappings (value -> key)
		// So we only include values that are not reverse mappings
		if (typeof value === 'number') {
			values.push(value);
		} else if (typeof value === 'string') {
			// Check if this is a reverse mapping for a numeric enum
			const possibleReverseKey = (enumType as Record<string, unknown>)[value];
			if (typeof possibleReverseKey !== 'number') {
				values.push(value);
			}
		}
	}

	return values;
}

function inferEnumType(enumValues: EnumValue[]): InferredEnumType | undefined {
	if (!enumValues.length) {
		return undefined;
	}

	const valueTypes = new Set(enumValues.map((value) => typeof value));
	if (valueTypes.size !== 1) {
		return undefined;
	}

	const [type] = valueTypes;
	if (type === 'string') {
		return 'string';
	}
	if (type === 'boolean') {
		return 'boolean';
	}
	if (type === 'number') {
		return enumValues.every((value) => typeof value === 'number' && Number.isInteger(value))
			? 'integer'
			: 'number';
	}

	return undefined;
}

function getTypeErrorMessage(type: InferredEnumType): string {
	switch (type) {
		case 'string':
			return 'The property must be a string.';
		case 'boolean':
			return 'The property must be a boolean.';
		case 'integer':
			return 'The property must be an integer.';
		case 'number':
			return 'The property must be a number.';
		default:
			return 'The property type is invalid.';
	}
}
