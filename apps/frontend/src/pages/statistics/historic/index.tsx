import { createElement, useState, useEffect } from 'my-react';
import { useAuth } from '../../../hook/useAuth';
import { api } from '../../../hook/useFetch';
import { MatchHistory, TransformedMatch, UserInfo } from '../../../types/stats';
import { useNavigate } from 'my-react-router';
import { useToast } from '@/hook/useToast';

function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const year = String(date.getFullYear()).slice(-2);
	return `${day}/${month}/${year}`;
}

function formatDuration(seconds: number): string {
	const minutes = Math.floor(seconds);
	return `${minutes}`;
}

function MatchCard({ match, isSelected, onClick }: { match: TransformedMatch; isSelected: boolean; onClick: () => void; key?: number | string }) {
	const bgColor = match.isWin ? 'bg-green-600' : 'bg-red-600';
	const borderColor = isSelected
		? match.isWin
			? 'border-yellow-400 border-4'
			: 'border-yellow-400 border-4'
		: 'border-transparent border-2';

	return (
		<button
			onClick={onClick}
			className={`w-full p-4 ${bgColor} ${borderColor} rounded-lg transition-all duration-200 hover:scale-[1.02] hover:brightness-110 text-center`}
		>
			<p className="font-pirulen text-lg tracking-wider text-white mb-1">
				{match.isWin ? 'Victory !' : 'Defeat'}
			</p>
			<p className="text-sm text-white/80 mb-2">Vs "{match.opponent}"</p>
			<p className="font-orbitron text-xl font-bold text-white">
				{match.myScore} - {match.opponentScore}
			</p>
		</button>
	);
}

function MatchDetails({ match, username }: { match: TransformedMatch; username: string }) {
	return (
		<div className="rounded-lg border border-slate-600/50 bg-slate-900/50 p-6 h-full flex flex-col">
			{/* Date */}
			<p className="text-gray-400 text-sm mb-6">{match.date}</p>

			{/* Score principal */}
			<div className="flex-1 flex flex-col items-center justify-center">
				<p className="font-orbitron text-6xl font-bold text-white mb-4">
					{match.myScore}-{match.opponentScore}
				</p>

				{/* Noms des joueurs */}
				<p className="text-lg mb-4">
					<span className={match.isWin ? 'text-green-400' : 'text-red-400'}>{username}</span>
					<span className="text-gray-400"> VS </span>
					<span className={match.isWin ? 'text-red-400' : 'text-green-400'}>{match.opponent}</span>
				</p>

				{/* Résultat */}
				<p className={`font-pirulen text-2xl tracking-wider mb-4 ${match.isWin ? 'text-green-400' : 'text-red-400'}`}>
					{match.isWin ? 'Victory !' : 'Defeat'}
				</p>

				{/* Elo */}
				<p className={`text-xs font-pirulen font-bold ${
						match.eloChange === 0 
						? 'text-yellow-400'
						: match.eloChange > 0 ? 'text-green-400' : 'text-red-400'
					}`}>
					{match.eloChange === 0  ? 'Tournament' : `${match.eloChange > 0 ? '+' : ''}${match.eloChange} Elo`}
				</p>
			</div>

			{/* Séparateur */}
			<div className="border-t border-gray-600 my-6" />

			{/* Stats supplémentaires */}
			<div className="flex justify-between text-gray-400">
				<p>Duration {match.duration}s</p>
				<p>Hit number : {match.hits}</p>
			</div>
		</div>
	);
}

export function StatisticsHistoryPage() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const { toast } = useToast();
	const [matches, setMatches] = useState<TransformedMatch[]>([]);
	const [selectedMatchId, setSelectedMatchId] = useState<number>(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);


	useEffect(() => {
		if (user?.isGuest) {
			toast('Please have an account to use all features', 'error');
			navigate('/play');
		}
	}, [user?.isGuest]);

	useEffect(() => {
		async function fetchHistory() {
			if (!user?.id) return;

			setLoading(true);
			setError(null);

			try {
				const historyRes = await api.get<MatchHistory[]>(`/api/stats/match-history/user/${user.id}`);

				if (historyRes.error || !historyRes.data) {
					setError(historyRes.error || 'Impossible to load history');
					setLoading(false);
					return;
				}

				const rawMatches = historyRes.data;
				if (rawMatches.length === 0) {
					setMatches([]);
					setLoading(false);
					return;
				}

				// Récupérer les usernames des adversaires
				const opponentIds = new Set<number>();
				rawMatches.forEach((m) => {
					const opponentId = m.player1_id === user.id ? m.player2_id : m.player1_id;
					opponentIds.add(opponentId);
				});

				const usernameMap = new Map<number, string>();
				await Promise.all(
					Array.from(opponentIds).map(async (id) => {
						const res = await api.get<UserInfo>(`/api/user/profile/${id}`);
						usernameMap.set(id, res.data?.username || `Player #${id}`);
					})
				);

				// Transformer les matchs
				const transformedMatches: TransformedMatch[] = rawMatches.map((m) => {
					const isPlayer1 = m.player1_id === user.id;
					const opponentId = isPlayer1 ? m.player2_id : m.player1_id;

					return {
						id: m.game_id,
						date: formatDate(m.created_at),
						opponent: usernameMap.get(opponentId) || `Player #${opponentId}`,
						myScore: isPlayer1 ? m.score_player1 : m.score_player2,
						opponentScore: isPlayer1 ? m.score_player2 : m.score_player1,
						isWin: m.winner_id === user.id,
						eloChange: isPlayer1 ? (m.gain_player1 || 0) : (m.gain_player2 || 0),
						duration: formatDuration(m.duration_seconds),
						hits: isPlayer1 ? m.hit_player1 : m.hit_player2,
					};
				});

				setMatches(transformedMatches);
				if (transformedMatches.length > 0) {
					setSelectedMatchId(transformedMatches[0].id);
				}
			} catch (err) {
				setError('Error while loading history');
			} finally {
				setLoading(false);
			}
		}

		fetchHistory();
	}, [user?.id]);

	if (loading) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<p className="font-pirulen text-cyan-400">Loading history...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<p className="font-pirulen text-red-400">{error}</p>
			</div>
		);
	}

	if (matches.length === 0) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<p className="font-pirulen text-gray-400">No match in history</p>
			</div>
		);
	}

	const selectedMatch = matches.find((m) => m.id === selectedMatchId) || matches[0];
	const username = user?.username || 'Vous';

	return (
		<div className="flex gap-6 p-4 h-full w-full min-h-[500px]">
			{/* Colonne gauche : Détails du match */}
			<div className="flex-[3]">
				{selectedMatch && <MatchDetails match={selectedMatch} username={username} />}
			</div>

			{/* Colonne droite : Liste des matchs */}
			<div className="flex-[2] flex flex-col gap-4 overflow-y-auto max-h-[600px] p-2 scrollbar-neon">
				{matches.map((match) => (
					<MatchCard
						key={match.id}
						match={match}
						isSelected={match.id === selectedMatchId}
						onClick={() => setSelectedMatchId(match.id)}
					/>
				))}
			</div>
		</div>
	);
}
