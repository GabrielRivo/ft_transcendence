import Database, { Statement} from 'better-sqlite3';
import { InjectPlugin, Service, BadRequestException } from 'my-fastify-decorators';


const addMatchHistoryStatement: string = 
`INSERT INTO matchHistory (userId1, userId2, scoreUser1, 
scoreUser2) VALUES (@userId1, @userId2, @scoreUser1, 
@scoreUser2);
`;

const getMatchHistorySQL: string = `
SELECT * FROM matchHistory 
WHERE userId1 = ? OR userId2 = ? 
ORDER BY created_at DESC;
`;

@Service()
export class MatchHistoryService {
	@InjectPlugin('db')
	private db !: Database.Database;

	private statementAddMatchtoHistory : Statement<{
		userId1	: number;
		userId2	: number;
		scoreUser1 : number;
		scoreUser2 : number;
	}>

	private statementGet !: Statement<[number, number]>;

	onModuleInit(){
		this.statementAddMatchtoHistory = this.db.prepare(addMatchHistoryStatement);
		this.statementGet = this.db.prepare(getMatchHistorySQL);
	}

	add_match_to_history(userId1 : number, userId2	: number, 
		scoreUser1 : number, scoreUser2 : number) {
			if (userId1 === userId2) {
				throw new BadRequestException("Same ids");
			}
			if (scoreUser1 < 0 || scoreUser2 < 0) {
				throw new BadRequestException("Negative scores");
			}
			return this.statementAddMatchtoHistory.run({
				userId1,
				userId2, 
				scoreUser1,
				scoreUser2,
			})
		}

	get_user_matches(userId: number) {
		try {
		return this.statementGet.all(userId, userId);
	} catch (error) {
		console.error("ERROR SQLITE :", error);
		throw error;
	}
		// return this.statementGet.all(userId, userId);
	}
	
	// delete_match_from_history(userId1 : number, userId2	: number, 
	// 	scoreUser1 : number, scoreUser2 : number){ // purpose?

	// }
}