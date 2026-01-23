import { createElement, useState, useEffect } from 'my-react';
import { useParams } from 'my-react-router';

// Types pour les matchs
interface Match {
	id: number;
	date: string;
	opponent: string;
	myScore: number;
	opponentScore: number;
	isWin: boolean;
	eloChange: number;
	duration: string;
	hits: number;
}

// Données mockées pour un autre utilisateur - à remplacer par les appels API
const getMockHistoricForUser = (userId: string) => ({
	username: userId,
	matches: [
		{ id: 1, date: '15/01/26', opponent: 'Champion42', myScore: 5, opponentScore: 2, isWin: true, eloChange: 18, duration: '3 min', hits: 51 },
		{ id: 2, date: '14/01/26', opponent: 'NovicePlayer', myScore: 5, opponentScore: 0, isWin: true, eloChange: 8, duration: '1 min', hits: 23 },
		{ id: 3, date: '13/01/26', opponent: 'MasterPong', myScore: 3, opponentScore: 5, isWin: false, eloChange: -22, duration: '6 min', hits: 78 },
		{ id: 4, date: '12/01/26', opponent: 'RandomUser', myScore: 5, opponentScore: 4, isWin: true, eloChange: 15, duration: '7 min', hits: 92 },
		{ id: 5, date: '11/01/26', opponent: 'ProGamer', myScore: 0, opponentScore: 5, isWin: false, eloChange: -25, duration: '2 min', hits: 18 },
		{ id: 6, date: '10/01/26', opponent: 'CasualPlayer', myScore: 5, opponentScore: 1, isWin: true, eloChange: 10, duration: '2 min', hits: 35 },
	] as Match[],
});

function MatchCard({ match, isSelected, onClick }: { match: Match; isSelected: boolean; onClick: () => void }) {
	const bgColor = match.isWin ? 'bg-green-600' : 'bg-red-600';
	const borderColor = isSelected
		? match.isWin
			? 'border-yellow-400 border-4'
			: 'border-cyan-400 border-4'
		: 'border-transparent border-2';

	return (
		<button
			onClick={onClick}
			className={`w-full p-4 ${bgColor} ${borderColor} rounded-lg transition-all duration-200 hover:scale-[1.02] hover:brightness-110 text-center`}
		>
			<p className="font-pirulen text-lg tracking-wider text-white mb-1">
				{match.isWin ? 'Victoire !' : 'Défaite'}
			</p>
			<p className="text-sm text-white/80 mb-2">Vs "{match.opponent}"</p>
			<p className="font-orbitron text-xl font-bold text-white">
				{match.myScore} - {match.opponentScore}
			</p>
		</button>
	);
}

function MatchDetails({ match, username }: { match: Match; username: string }) {
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
					{match.isWin ? 'Victoire !' : 'Défaite'}
				</p>

				{/* Elo */}
				<p className={`text-lg ${match.eloChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
					{match.eloChange > 0 ? '+' : ''}{match.eloChange} Elo
				</p>
			</div>

			{/* Séparateur */}
			<div className="border-t border-gray-600 my-6" />

			{/* Stats supplémentaires */}
			<div className="flex justify-between text-gray-400">
				<p>Durée {match.duration}</p>
				<p>Nombre de hit : {match.hits}</p>
			</div>
		</div>
	);
}

export function StatisticsHistoricPageSlug() {
	const params = useParams();
	const userId = params.statsId || 'Unknown';
	const historicData = getMockHistoricForUser(userId);

	const [selectedMatchId, setSelectedMatchId] = useState<number>(historicData.matches[0]?.id || 0);

	useEffect(() => {
		console.log('Statistics Historic Page Params :', params);
	}, [params]);

	const selectedMatch = historicData.matches.find((m) => m.id === selectedMatchId) || historicData.matches[0];

	return (
		<div className="flex flex-col gap-6 p-4 w-full">
			{/* Header avec nom du joueur */}
			<div className="rounded-lg border border-purple-500/30 bg-slate-900/50 p-4 text-center">
				<p className="font-pirulen text-lg tracking-wider text-purple-400">
					Historique de "{historicData.username}"
				</p>
			</div>

			{/* Contenu principal */}
			<div className="flex gap-6 h-full w-full min-h-[500px]">
				{/* Colonne gauche : Détails du match */}
				<div className="flex-[3]">
					{selectedMatch && <MatchDetails match={selectedMatch} username={historicData.username} />}
				</div>

				{/* Colonne droite : Liste des matchs */}
				<div className="flex-[2] flex flex-col gap-3 overflow-y-auto max-h-[600px] pr-2 scrollbar-neon">
					{historicData.matches.map((match) => (
						<MatchCard
							key={match.id}
							match={match}
							isSelected={match.id === selectedMatchId}
							onClick={() => setSelectedMatchId(match.id)}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
