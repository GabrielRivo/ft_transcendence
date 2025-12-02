import { createTypeDecorator } from '../factory.js';

export const IsString = createTypeDecorator('string', 'The property must be a string.');
