import { createTypeDecorator, updateAndSetMetadata } from '../factory.js';

type NestedDto = new () => any;

interface IsObjectOptions {
	message?: string;
	itemType?: NestedDto;
}

/**
 * A decorator that defines a property as an object. It can also specify a DTO class
 * for nested validation.
 */
export function IsObject(options?: IsObjectOptions): PropertyDecorator {
	return (target: object, propertyKey: string | symbol) => {
		// First, mark the property as type 'object'.
		createTypeDecorator('object', 'The property must be an object.')(options)(target, propertyKey);

		// Then, add the specific nested DTO class information to the metadata.
		if (options?.itemType) {
			updateAndSetMetadata(target, propertyKey, (propValidations) => {
				// We reuse the 'itemType' metadata key for simplicity, as it's handled by type context.
				propValidations.itemType = options.itemType;
			});
		}
	};
}
