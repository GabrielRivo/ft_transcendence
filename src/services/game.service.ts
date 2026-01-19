import { Service } from 'my-fastify-decorators';
import config from '../config.js';

export interface GameInfo {
	id: string;
	status: 'PENDING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
	winnerId?: string | null;
	score?: [number, number] | null;
}

export interface CreateGameRequest {
	player1Id: string;
	player2Id: string;
	tournamentId: string;
	matchId: number;
}

@Service()
export class GameService {
	private baseUrl = config.gameServiceUrl;

	private async fetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
		const res = await fetch(url, options);
		if (!res.ok) return null;
		return (await res.json()) as T;
	}

	private async withRetry<T>(fn: () => Promise<T | null>, retries = 3, delays = [1000, 2000, 5000]): Promise<T | null> {
		let attempt = 0;
		let lastError: unknown;
		while (attempt <= retries) {
			try {
				const result = await fn();
				if (result) return result;
			} catch (err) {
				lastError = err;
			}
			if (attempt === retries) break;
			await new Promise((r) => setTimeout(r, delays[Math.min(attempt, delays.length - 1)]));
			attempt += 1;
		}
		if (lastError) {
			// Intentionally silent here; caller can decide to log
		}
		return null;
	}

	/**
	 * Crée un match dans le Game Service (best-effort avec retries).
	 */
	async createGame(payload: CreateGameRequest): Promise<string | null> {
		if (!this.baseUrl) return null;
		const result = await this.withRetry(async () => {
			const res = await fetch(`${this.baseUrl}/games`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!res.ok) return null;
			const data = (await res.json()) as { gameId?: string };
			return data.gameId ?? null;
		});
		return result;
	}

	/**
	 * Récupère l'état d'une partie auprès du Game Service (best-effort).
	 */
	async getGame(gameId: string): Promise<GameInfo | null> {
		if (!this.baseUrl) return null;
		const result = await this.withRetry<GameInfo | null>(async () => {
			const data = await this.fetchJson<Partial<GameInfo>>(`${this.baseUrl}/games/${gameId}`);
			if (!data || !data.id) return null;
			return {
				id: data.id,
				status: (data.status as GameInfo['status']) ?? 'PENDING',
				winnerId: data.winnerId ?? null,
				score: (data.score as [number, number] | undefined) ?? null,
			};
		});
		return result;
	}
}
