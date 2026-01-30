export abstract class GameGateway {
    abstract createGame(matchId: string, player1Id: string, player2Id: string, tournamentId?: string, isFinal?: boolean): Promise<string>;
}
