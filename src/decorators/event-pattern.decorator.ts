import 'reflect-metadata';
import { MICROSERVICE_METADATA } from '../helpers/metadata.keys.js';

export function EventPattern(pattern: string): MethodDecorator {
    return (target: object, propertyKey: string | symbol) => {
        Reflect.defineMetadata(MICROSERVICE_METADATA.eventPattern, pattern, target, propertyKey);
    };
}