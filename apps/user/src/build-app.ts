import Ajv from 'ajv';
import * as ajvErrors from 'ajv-errors';
import Fastify from 'fastify';
import { registerValidators } from 'my-class-validator';
import 'reflect-metadata';
import pluginManager from './plugin-manager.js';
import bootstrapPlugin from './plugins/bootstrap-plugin.js';

export function buildApp(options: { dbPath?: string } = {}) {
	const app = Fastify({
		logger: true,
		bodyLimit: 10 * 1024 * 1024,
		routerOptions: {
			ignoreTrailingSlash: true,
			ignoreDuplicateSlashes: true,
		},
	});

	app.get('/health', async () => {
		return { status: 'ok' };
	});

	const addAjvErrors = ajvErrors.default;
	const ajv = new Ajv.default({ allErrors: true, $data: true, messages: true, coerceTypes: true });
	addAjvErrors.default(ajv);

	registerValidators(ajv);

	pluginManager(app, options);
	app.register(bootstrapPlugin);

	app.setValidatorCompiler(({ schema }) => {
		return ajv.compile(schema);
	});

	type SchemaError = Error & {
		validation: Ajv.ErrorObject[];
		code: string;
		statusCode: number;
		stack: undefined;
	};

	app.setSchemaErrorFormatter((errors) => {
		const message =
			errors
				.map((e) => e.message)
				.filter(Boolean)
				.join('; ') || 'Validation error';
		const err = new Error(message) as SchemaError;
		err.statusCode = 400;
		err.code = 'DTO_VALIDATION_ERROR';
		err.validation = errors;
		err.stack = undefined as never;

		return err;
	});

	app.setErrorHandler((error, _request, reply) => {
		console.error('Global Error Handler:', error);
		reply.send(error);
	});

	return app;
}
