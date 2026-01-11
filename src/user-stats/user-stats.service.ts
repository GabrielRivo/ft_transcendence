import Database, { Statement } from 'better-sqlite3';
import { Inject, InjectPlugin, Service } from 'my-fastify-decorators';


@Service()
export class UserStatsService {
	@InjectPlugin('db')
	private db !: Database.Database;
}