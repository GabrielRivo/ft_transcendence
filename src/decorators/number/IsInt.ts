import { createTypeDecorator } from '../factory.js';

export const IsInt = createTypeDecorator('integer', 'The property must be an integer.');
