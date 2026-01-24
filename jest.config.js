/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^rabbitmq-client$': '<rootDir>/../../packages/rabbitmq-client/dist/index.js',
        '^my-fastify-decorators$': '<rootDir>/../../packages/my-fastify-decorators/dist/index.js',
        '^my-class-validator$': '<rootDir>/../../packages/my-class-validator/dist/index.js',
    },
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: 'tsconfig.jest.json',
            },
        ],
    },
};
