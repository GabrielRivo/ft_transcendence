import 'reflect-metadata';
import { MICROSERVICE_METADATA } from '../helpers/metadata.keys.js';

export enum MicroserviceParamType {
    PAYLOAD,
    CONTEXT,
}

export interface MicroserviceParamDef {
    index: number;
    type: MicroserviceParamType;
}

function createParamDecorator(type: MicroserviceParamType) {
    return (): ParameterDecorator => (target, propertyKey, index) => {
        if (!propertyKey) return;
        const params: MicroserviceParamDef[] = Reflect.getOwnMetadata(MICROSERVICE_METADATA.params, target, propertyKey) || [];
        params.push({ index, type });
        Reflect.defineMetadata(MICROSERVICE_METADATA.params, params, target, propertyKey);
    };
}

/**
* Payload: Decorator qui extrait le payload du message.
* 
* Exemple:
* @EventPattern('my-event')
* handleEvent(@Payload() payload: any) {
*   console.log(payload);
* }
*
*  Example of payload:
*  {
*   data: {
*     name: 'Michel',
*     age: 30,
*   },
* }
*/
export const Payload = createParamDecorator(MicroserviceParamType.PAYLOAD);

/**
* Ctx: Decorator qui extrait le context du message.
* 
* Exemple:
* @EventPattern('my-event')
* handleEvent(@Ctx() ctx: any) {
*   console.log(ctx);
* }
*
* Content Execution Context:
* {
*   channel: Channel;
*   message: Message;
*   ack: () => void;
*   nack: () => void;
* }
*/
export const Ctx = createParamDecorator(MicroserviceParamType.CONTEXT);