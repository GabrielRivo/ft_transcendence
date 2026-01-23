import { createElement, useEffect, useRef } from 'my-react';
import { useParams } from 'my-react-router';
import EloHistogram from '@ui/charts/EloHistogram';
import ApexCharts, { ApexOptions } from 'apexcharts';

// Données mockées pour un autre utilisateur - à remplacer par les appels API
const getMockStatsForUser = (userId: string) => ({
	username: userId,
	elo: 1200,
	gamesPlayed: 42,
	wins: 28,
	losses: 14,
	winRate: 67,
	averageScore: 3.21,
	tournamentsPlayed: 8,
	tournamentsWon: 3,
	percentile: 85.2,
	allPlayersElo: [500, 500, 500, 600, 700, 1000, 1000, 1000, 1000, 1200, 1500, 1800, 1758],
});

function WinRatePieChart({ winRate }: { winRate: number }) {
	const chartRef = useRef<HTMLDivElement | null>(null);
	const chartInstance = useRef<ApexCharts | null>(null);

	useEffect(() => {
		if (!chartRef.current) return;

		if (chartInstance.current) {
			chartInstance.current.destroy();
		}

		const options: ApexOptions = {
			chart: {
				type: 'pie',
				height: 200,
				background: 'transparent',
			},
			series: [winRate, 100 - winRate],
			labels: ['Victoires', 'Défaites'],
			colors: ['#22c55e', '#ef4444'],
			legend: {
				show: false,
			},
			dataLabels: {
				enabled: true,
				formatter: (val: number) => `${Math.round(val)}%`,
				style: {
					fontSize: '14px',
					fontWeight: 'bold',
					colors: ['#fff'],
				},
				dropShadow: {
					enabled: true,
					top: 1,
					left: 1,
					blur: 2,
					opacity: 0.8,
				},
			},
			stroke: {
				show: true,
				width: 2,
				colors: ['#1e293b'],
			},
			tooltip: {
				enabled: true,
				theme: 'dark',
			},
			plotOptions: {
				pie: {
					expandOnClick: false,
					donut: {
						size: '0%',
					},
				},
			},
		};

		const chart = new ApexCharts(chartRef.current, options);
		chart.render();
		chartInstance.current = chart;

		return () => {
			if (chartInstance.current) {
				chartInstance.current.destroy();
				chartInstance.current = null;
			}
		};
	}, [winRate]);

	return <div ref={chartRef} className="h-[200px] w-full" />;
}

function StatCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
	return (
		<div className="text-center">
			<p className="font-pirulen mb-1 text-xs tracking-wider text-gray-400">{title}</p>
			<p className="font-orbitron text-4xl font-bold text-white">{value}</p>
			{subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
		</div>
	);
}

export function StatisticsGeneralPageSlug() {
	const params = useParams();
	const userId = params.statsId || 'Unknown';
	const stats = getMockStatsForUser(userId);

	useEffect(() => {
		console.log('Statistics Page Params :', params);
	}, [params]);

	return (
		<div className="flex w-full flex-col gap-6 p-4">
			{/* Header avec nom du joueur */}
			<div className="rounded-lg border border-purple-500/30 bg-slate-900/50 p-4 text-center">
				<p className="font-pirulen text-lg tracking-wider text-purple-400">Statistiques de "{stats.username}"</p>
			</div>

			{/* Ligne 1 : Histogramme Elo + Parties jouées */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{/* Histogramme Elo */}
				<div className="rounded-lg border border-cyan-500/30 bg-slate-900/50 p-4 lg:col-span-2">
					<div className="mb-2">
						<h3 className="font-pirulen text-sm tracking-wider text-cyan-400">Elo :</h3>
					</div>
					<EloHistogram userElo={stats.elo} allPlayersData={stats.allPlayersElo} />
				</div>

				{/* Parties jouées */}
				<div className="flex flex-col items-center justify-center rounded-lg border border-purple-500/30 bg-slate-900/50 p-6">
					<StatCard title="Parties jouées :" value={stats.gamesPlayed} />
				</div>
			</div>

			{/* Ligne 2 : Score moyen + Pie Chart + Tournois */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
				{/* Score moyen par partie */}
				<div className="flex flex-col items-center justify-center rounded-lg border border-orange-500/30 bg-slate-900/50 p-6">
					<p className="font-pirulen mb-1 text-xs tracking-wider text-orange-400">Score moyen par partie :</p>
					<p className="font-orbitron mb-2 text-4xl font-bold text-white">{stats.averageScore}</p>
					<p className="text-xs text-gray-500 italic">(arrondi au 0,01 sup)</p>
				</div>

				{/* Pie Chart - Taux de victoire */}
				<div className="flex flex-col items-center rounded-lg border border-green-500/30 bg-slate-900/50 p-4 lg:col-span-2">
					<p className="font-pirulen mb-2 text-sm tracking-wider text-green-400">Taux de victoire : {stats.winRate}%</p>
					<WinRatePieChart winRate={stats.winRate} />
				</div>

				{/* Tournois */}
				<div className="flex flex-col items-center justify-center gap-6 rounded-lg border border-red-500/30 bg-slate-900/50 p-6">
					<StatCard title="Tournois joués :" value={stats.tournamentsPlayed} />
					<StatCard title="Tournois remportés :" value={stats.tournamentsWon} />
				</div>
			</div>

			{/* Ligne 3 : Message de classement */}
			<div className="rounded-lg border border-cyan-500/30 bg-slate-900/50 p-6 text-center">
				<p className="font-pirulen text-lg tracking-wider text-cyan-400">
					Ce joueur est meilleur que {stats.percentile}% des joueurs!
				</p>
			</div>
		</div>
	);
}
