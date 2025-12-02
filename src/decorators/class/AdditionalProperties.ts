import 'reflect-metadata';
import { METADATA_KEYS } from '../../metadata.keys.js';

interface AdditionalPropertiesOptions {
	message?: string;
}

export function AdditionalProperties(
	allowed: boolean,
	options?: AdditionalPropertiesOptions,
): ClassDecorator {
	return (target: Function) => {
		const metadata = {
			allowed: allowed,
			message: options?.message,
		};
		Reflect.defineMetadata(METADATA_KEYS.additionalProperties, metadata, target);
	};
}
