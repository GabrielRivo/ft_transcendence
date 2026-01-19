import { Module } from 'my-fastify-decorators';
import { BracketService } from './bracket.service.js';

@Module({
	providers: [BracketService],
})
export class BracketModule {}
