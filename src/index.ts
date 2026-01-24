import 'reflect-metadata';
import Ajv from 'ajv';
import * as ajvErrors from 'ajv-errors';
import Fastify from 'fastify';
import { registerValidators } from 'my-class-validator';
import bootstrapPlugin from './plugins/bootstrap-plugin.js';
import jwtPlugin from './plugins/jwt-plugin.js';
import socketPlugin from './plugins/socket-plugin.js';
import sqlitePlugin from './plugins/sqlite-plugin.js';
import rabbitmqPlugin from './plugins/rabbitmq-plugin.js';

const app = Fastify({ logger: true, routerOptions: { ignoreTrailingSlash: true } });

const AjvCtor: any = (Ajv as any).default ?? Ajv;
const addAjvErrors: any = (ajvErrors as any).default ?? ajvErrors;
const ajv = new AjvCtor({ allErrors: true, $data: true, messages: true, coerceTypes: true } as any);
addAjvErrors(ajv);

registerValidators(ajv);

app.register(sqlitePlugin);
app.register(jwtPlugin);
app.register(socketPlugin);
app.register(rabbitmqPlugin);
app.register(bootstrapPlugin);

app.setValidatorCompiler(({ schema }) => {
	return ajv.compile(schema as any);
});

app.setSchemaErrorFormatter((errors) => {
	const message =
		errors
			.map((e) => e.message)
			.filter(Boolean)
			.join('; ') || 'Validation error';
	const err: any = new Error(message);
	err.statusCode = 400;
	err.validation = errors;
	// On évite de pointer systématiquement sur index.ts
	err.stack = undefined;

	app.log.error({ validationErrors: errors }, 'Schema validation failed');
	return err as Error;
});

app.setErrorHandler((error, request, reply) => {
	app.log.error({
		msg: 'Global Error Handler',
		error: (error as any).message,
		stack: (error as any).stack,
		url: request.url,
		method: request.method
	});

	// Pass through status code if set (e.g., 404, 400), otherwise 500
	const statusCode = (error as any).statusCode || 500;

	const response = {
		statusCode,
		error: statusCode === 500 ? 'Internal Server Error' : (error as any).name,
		message: (error as any).message,
		...(error as any) // Spread remaining properties (like activeTournamentId, code)
	};

	reply.status(statusCode).send(response);
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
