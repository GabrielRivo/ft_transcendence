import { createTypeDecorator, updateAndSetMetadata } from '../factory.js';

type ItemType = 'string' | 'number' | 'integer' | 'boolean' | (new () => any);

interface IsArrayOptions {
	message?: string;
	itemType?: ItemType;
}

export function IsArray(options?: IsArrayOptions): PropertyDecorator {
	return (target: object, propertyKey: string | symbol) => {
		createTypeDecorator('array', 'The property must be an array.')(options)(target, propertyKey);

		if (options?.itemType) {
			updateAndSetMetadata(target, propertyKey, (propValidations) => {
				propValidations.itemType = options.itemType;
			});
		}
	};
}
