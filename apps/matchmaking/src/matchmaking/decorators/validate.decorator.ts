import Ajv from 'ajv';
import ajvErrors from 'ajv-errors';

const ajv = new Ajv.default({ allErrors: true, $data: true, messages: true, coerceTypes: false });
ajvErrors.default(ajv);

const compiledSchemas = new WeakMap<object, Ajv.ValidateFunction>();

export function ValidateResult(schema: object) {
	return function (_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value;

		descriptor.value = async function (...args: any[]) {
			const result = await originalMethod.apply(this, args);

			let validate = compiledSchemas.get(schema);
			if (!validate) {
				validate = ajv.compile(schema);
				compiledSchemas.set(schema, validate);
			}

			const isValid = validate(result);

			if (!isValid) throw new Error(`Data validation failed for ${propertyKey}`);

			return result;
		};

		return descriptor;
	};
}
