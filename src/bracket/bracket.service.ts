import { Service } from 'my-fastify-decorators';
import { BracketData, BracketMatch, Participant } from '../types.js';

@Service()
export class BracketService {
	/**
	 * Generate a new bracket for a tournament with 4, 8 or 16 players
	 * @param participants Participant[] - The participants of the tournament
	 */
	generateBracket(participants: Participant[]): BracketData {
		const size = participants.length;
		this.assertValidSize(size);

		const shuffled = this.shufflePlayers(participants);
		const totalRounds = Math.log2(size);
		const matches: BracketMatch[] = [];

        // Round 1 (Les seuls matchs avec des joueurs initiaux)
        // Pour 8 joueurs -> 4 matchs au Round 1 (index 0 à 3)
        const round1MatchCount = size / 2;
        let matchId = 0;
        let totalMatches = round1MatchCount;

        for (let i = 0; i < round1MatchCount; i++) {
            matches.push({
                id: matchId,
                round: 1,
                status: 'PENDING',
                player1Id: shuffled[i * 2]!.id,
                player2Id: shuffled[i * 2 + 1]!.id,
                winnerId: null,
                score: null,
                nextMatchId: totalMatches + Math.floor(i / 2)
            });
            matchId++;
        }

        // Rounds suivants (Slots vides)
        // On itère de 2 jusqu'à totalRounds
        let previousRoundMatchCount = round1MatchCount;

        for (let r = 2; r <= totalRounds; r++) {
            const currentRoundMatchCount = previousRoundMatchCount / 2;
            totalMatches += currentRoundMatchCount;

            for (let i = 0; i < currentRoundMatchCount; i++) {
                matches.push({
                    id: matchId,
                    round: r,
                    status: 'PENDING', // En attente des vainqueurs précédents
                    player1Id: null,
                    player2Id: null,
                    winnerId: null,
                    score: null,
                    nextMatchId: r === totalRounds ? null : totalMatches + Math.floor(i / 2),
                });
                matchId++;
            }

            previousRoundMatchCount = currentRoundMatchCount;
        }

		return {
			currentRound: 1,
			totalRounds,
			matches,
		};
	}

	private shufflePlayers(players: Participant[]): Participant[] {
		const arr = [...players];
		const rng = Math.random;

		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(rng() * (i + 1));
			// @ts-expect-error - Les éléments existent car i et j sont dans les bornes
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}

	advanceWinner(
		bracket: BracketData,
		gameId: string,
		winnerId: string,
		score: [number, number],
	): BracketData {
		const match = bracket.matches.find((m) => m.gameId === gameId);
		if (!match) {
			throw new Error('Match not found');
		}
		if (match.status === 'COMPLETED') {
			throw new Error('Match already completed');
		}
		if (match.status !== 'SCHEDULED' && match.status !== 'IN_PROGRESS') {
			throw new Error('Match not started');
		}

		match.score = [score[0], score[1]];
		this.setWinnerAndPropagate(bracket, match, winnerId);

		return bracket;
	}

	isRoundComplete(bracket: BracketData): boolean {
		const currentRoundMatches = bracket.matches.filter((m) => m.round === bracket.currentRound);
		if (currentRoundMatches.length === 0) {
			return false;
		}
		return currentRoundMatches.every(
			(m) =>
				m.status === 'COMPLETED' &&
				m.winnerId !== null &&
				m.player1Id !== null &&
				m.player2Id !== null,
		);
	}

    isTournamentComplete(bracket: BracketData): boolean {
        const finalMatch = bracket.matches
            .find(m => m.round === bracket.totalRounds && m.status === 'COMPLETED' && m.winnerId !== null);
        return finalMatch !== undefined;
    }

    /**
     * Récupère un match par son ID
     */
    getMatchById(bracket: BracketData, matchId: number): BracketMatch | undefined {
        return bracket.matches.find(m => m.id === matchId);
    }

    /**
     * Récupère un match par son gameId
     */
    getMatchByGameId(bracket: BracketData, gameId: string): BracketMatch | undefined {
        return bracket.matches.find(m => m.gameId === gameId);
    }

    /**
     * Vérifie si un match est prêt à être lancé (2 joueurs présents, pas encore commencé)
     */
    isMatchReady(match: BracketMatch): boolean {
        return (
            match.player1Id !== null &&
            match.player2Id !== null &&
            match.status === 'PENDING'
        );
    }

    /**
     * Lance un match en assignant un gameId et en changeant le statut
     */
	launchMatch(bracket: BracketData, matchId: number, gameId: string): BracketData {
		const match = this.getMatchById(bracket, matchId);
		if (!match) {
			throw new Error('Match not found');
		}
		if (!this.isMatchReady(match)) {
			throw new Error('Match is not ready to be launched');
		}
		if (match.status !== 'PENDING') {
			throw new Error('Match already started or scheduled');
		}
		match.gameId = gameId;
		match.status = 'SCHEDULED';
		match.startTime = new Date().toISOString();
		return bracket;
	}

    /**
     * Marque un match comme en cours
     */
	setMatchInProgress(bracket: BracketData, gameId: string): BracketData {
		const match = this.getMatchByGameId(bracket, gameId);
		if (!match) {
			throw new Error('Match not found');
		}
		if (match.status === 'COMPLETED') {
			throw new Error('Match already completed');
		}
		if (match.status === 'IN_PROGRESS') {
			return bracket;
		}
		if (match.status !== 'SCHEDULED' && match.status !== 'PENDING') {
			throw new Error('Match cannot transition to IN_PROGRESS from current status');
		}
		match.status = 'IN_PROGRESS';
		if (!match.startTime) {
			match.startTime = new Date().toISOString();
		}
		return bracket;
	}

	/**
	 * Déclare un forfait/abandon pour un match et propage le vainqueur.
	 */
	forfeitMatch(bracket: BracketData, matchId: number, forfeitingPlayerId: string): BracketData {
		const match = this.getMatchById(bracket, matchId);
		if (!match) {
			throw new Error('Match not found');
		}
		if (match.status === 'COMPLETED') {
			throw new Error('Match already completed');
		}
		if (match.player1Id !== forfeitingPlayerId && match.player2Id !== forfeitingPlayerId) {
			throw new Error('Forfeiting player not in match');
		}

		const winnerId =
			match.player1Id === forfeitingPlayerId ? match.player2Id : match.player1Id;
		if (!winnerId) {
			throw new Error('No opponent available to advance');
		}

		match.score = match.score ?? null;
		this.setWinnerAndPropagate(bracket, match, winnerId);
		return bracket;
	}

	/**
	 * Récupère tous les matchs du round courant
	 */
	getCurrentRoundMatches(bracket: BracketData): BracketMatch[] {
		return bracket.matches.filter((m) => m.round === bracket.currentRound);
	}

	/**
	 * Récupère les matchs prêts à être lancés dans le round courant
	 */
	getReadyMatches(bracket: BracketData): BracketMatch[] {
		return this.getCurrentRoundMatches(bracket).filter((m) => this.isMatchReady(m));
	}

	/**
	 * Passe au round suivant si le round actuel est complet
	 */
	advanceToNextRound(bracket: BracketData): BracketData {
		if (!this.isRoundComplete(bracket)) {
			return bracket;
		}
		if (bracket.currentRound < bracket.totalRounds) {
			bracket.currentRound += 1;
		}
		return bracket;
	}

	/**
	 * Récupère l'ID du vainqueur final (si le tournoi est terminé)
	 */
	getFinalWinnerId(bracket: BracketData): string | null {
		const finalMatch = bracket.matches.find(
			(m) => m.round === bracket.totalRounds && m.status === 'COMPLETED',
		);
		return finalMatch?.winnerId ?? null;
	}

	private assertValidSize(size: number): void {
		if (size !== 4 && size !== 8 && size !== 16) {
			throw new Error('Tournament size must be 4, 8 or 16');
		}
	}

	private setWinnerAndPropagate(
		bracket: BracketData,
		match: BracketMatch,
		winnerId: string,
	): void {
		match.winnerId = winnerId;
		match.status = 'COMPLETED';
		if (!match.startTime) {
			match.startTime = new Date().toISOString();
		}
		match.endTime = new Date().toISOString();

		if (match.nextMatchId !== null) {
			const nextMatch = bracket.matches.find((m) => m.id === match.nextMatchId);
			if (!nextMatch) {
				throw new Error('Next match not found');
			}
			if (!nextMatch.player1Id) {
				nextMatch.player1Id = winnerId;
			} else if (!nextMatch.player2Id) {
				nextMatch.player2Id = winnerId;
			} else {
				throw new Error('Next match already has two players');
			}
		}
	}
}
