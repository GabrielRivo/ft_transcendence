import { Inject, Service } from 'my-fastify-decorators';
import { HistoryRepository, type PlayerHistoryEntry } from './history.repository.js';

@Service()
export class HistoryService {
	@Inject(HistoryRepository)
	private historyRepository!: HistoryRepository;

	listUserHistory(userId: string): PlayerHistoryEntry[] {
		return this.historyRepository.listByUser(userId);
	}
}
