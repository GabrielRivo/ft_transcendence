import Ajv from 'ajv';
import * as ajvErrors from 'ajv-errors';
import Fastify from 'fastify';
import { registerValidators } from 'my-class-validator';
import 'reflect-metadata';
import bootstrapPlugin from './plugins/bootstrap-plugin.js';
import jwtPlugin from './plugins/jwt-plugin.js';
import socketPlugin from './plugins/socket-plugin.js';
import sqlitePlugin from './plugins/sqlite-plugin.js';

const app = Fastify({
	logger: true,
	routerOptions: {
		ignoreTrailingSlash: true,
		ignoreDuplicateSlashes: true,
		// bodyLimit: 1024 * 1024 * 10,
		// maxParamLength: 100,
		// caseSensitive: false,
		// trustProxy: true, // WARNING: a revoir
	},
});

const addAjvErrors = ajvErrors.default;
const ajv = new Ajv.default({ allErrors: true, $data: true, messages: true, coerceTypes: true });
addAjvErrors.default(ajv);

registerValidators(ajv);

app.register(jwtPlugin);
app.register(sqlitePlugin);
app.register(socketPlugin);
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
	err.stack = undefined;

	return err;
});

async function start() {
	try {
		await app.listen({ port: 3000, host: '0.0.0.0' });
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
}

start();
