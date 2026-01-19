import { Module } from 'my-fastify-decorators';
import { HistoryRepository } from './history.repository.js';
import { HistoryService } from './history.service.js';

@Module({
	providers: [HistoryRepository, HistoryService],
})
export class HistoryModule {}
