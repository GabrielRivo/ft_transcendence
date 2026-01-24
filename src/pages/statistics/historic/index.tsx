import { createElement, useState } from 'my-react';

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

// Données mockées - à remplacer par les appels API
const mockHistoricStats = {
	username: 'Vous',
	matches: [
		{ id: 1, date: '10/01/26', opponent: 'UserName1', myScore: 5, opponentScore: 0, isWin: true, eloChange: 15, duration: '2 min', hits: 42 },
		{ id: 2, date: '09/01/26', opponent: 'UserName2', myScore: 5, opponentScore: 3, isWin: true, eloChange: 12, duration: '4 min', hits: 67 },
		{ id: 3, date: '08/01/26', opponent: 'UserName', myScore: 1, opponentScore: 5, isWin: false, eloChange: -18, duration: '3 min', hits: 34 },
		{ id: 4, date: '07/01/26', opponent: 'UserName', myScore: 2, opponentScore: 5, isWin: false, eloChange: -14, duration: '5 min', hits: 56 },
		{ id: 5, date: '06/01/26', opponent: 'ProPlayer', myScore: 5, opponentScore: 4, isWin: true, eloChange: 20, duration: '8 min', hits: 89 },
	] as Match[],
};

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

export function StatisticsHistoricPage() {
	const [selectedMatchId, setSelectedMatchId] = useState<number>(mockHistoricStats.matches[0]?.id || 0);

	const selectedMatch = mockHistoricStats.matches.find((m) => m.id === selectedMatchId) || mockHistoricStats.matches[0];

	return (
		<div className="flex gap-6 p-4 h-full w-full min-h-[500px]">
			{/* Colonne gauche : Détails du match */}
			<div className="flex-[3]">
				{selectedMatch && <MatchDetails match={selectedMatch} username={mockHistoricStats.username} />}
			</div>

			{/* Colonne droite : Liste des matchs */}
			<div className="flex-[2] flex flex-col gap-3 overflow-y-auto max-h-[600px] pr-2 scrollbar-neon">
				{mockHistoricStats.matches.map((match) => (
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
