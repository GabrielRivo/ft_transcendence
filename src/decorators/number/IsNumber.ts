import { createTypeDecorator } from '../factory.js';

export const IsNumber = createTypeDecorator('number', 'The property must be a number.');
