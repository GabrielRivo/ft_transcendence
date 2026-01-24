import { createElement, useEffect, useRef, useState } from 'my-react';
import EloHistogram from '@ui/charts/EloHistogram';
import ApexCharts, { ApexOptions } from 'apexcharts';
import { useAuth } from '../../../hook/useAuth';
import { api } from '../../../hook/useFetch';
import { UserStats } from '../../../types/stats';

interface GeneralStatsDisplay {
	username: string;
	elo: number;
	gamesPlayed: number;
	wins: number;
	losses: number;
	winRate: number;
	averageScore: number;
	tournamentsPlayed: number;
	tournamentsWon: number;
	percentile: number;
	allPlayersElo: number[];
}

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
			labels: ['Victories', 'Defeat'],
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

export function StatisticsGeneralPage() {
	const { user } = useAuth();
	const [stats, setStats] = useState<GeneralStatsDisplay | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchStats() {
			if (!user?.id) return;

			setLoading(true);
			setError(null);

			try {
				const [userStatsRes, allElosRes] = await Promise.all([
					api.get<UserStats>(`/api/stats/user/${user.id}`),
					api.get<number[]>('/api/stats/all-elos'),
				]);

				if (userStatsRes.error || !userStatsRes.data) {
					setError(userStatsRes.error || 'Impossible de charger les statistiques');
					setLoading(false);
					return;
				}

				const userStats = userStatsRes.data;
				const allElos = allElosRes.data || [];

				// Calcul du percentile
				const playersBelow = allElos.filter((elo) => elo < userStats.elo).length;
				const percentile = allElos.length > 0 ? Math.round((playersBelow / allElos.length) * 1000) / 10 : 0;

				setStats({
					username: user.username || 'Vous',
					elo: userStats.elo,
					gamesPlayed: userStats.total_games,
					wins: userStats.wins,
					losses: userStats.losses,
					winRate: userStats.winrate,
					averageScore: userStats.average_score,
					tournamentsPlayed: userStats.tournament_played,
					tournamentsWon: userStats.tournament_won,
					percentile,
					allPlayersElo: allElos,
				});
			} catch (err) {
				setError('Erreur lors du chargement des statistiques');
			} finally {
				setLoading(false);
			}
		}

		fetchStats();
	}, [user?.id, user?.username]);

	if (loading) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<p className="font-pirulen text-cyan-400">Chargement des statistiques...</p>
			</div>
		);
	}

	if (error || !stats) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<p className="font-pirulen text-red-400">{error || 'Aucune statistique disponible'}</p>
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col gap-6 p-4">
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
					<StatCard title="Games played :" value={stats.gamesPlayed} />
				</div>
			</div>

			{/* Ligne 2 : Score moyen + Pie Chart + Tournois */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
				{/* Score moyen par partie */}
				<div className="flex flex-col items-center justify-center rounded-lg border border-orange-500/30 bg-slate-900/50 p-6">
					<p className="font-pirulen mb-1 text-xs tracking-wider text-orange-400">Average score by game :</p>
					<p className="font-orbitron mb-2 text-4xl font-bold text-white">{stats.averageScore}</p>
					<p className="text-xs text-gray-500 italic">(rounded up to the 0.01 sup)</p>
				</div>

				{/* Pie Chart - Taux de victoire */}
				<div className="flex flex-col items-center rounded-lg border border-green-500/30 bg-slate-900/50 p-4 lg:col-span-2">
					<p className="font-pirulen mb-2 text-sm tracking-wider text-green-400">Winrate : {stats.winRate}%</p>
					<WinRatePieChart winRate={stats.winRate} />
				</div>

				{/* Tournois */}
				<div className="flex flex-col items-center justify-center gap-6 rounded-lg border border-red-500/30 bg-slate-900/50 p-6">
					<StatCard title="Tournament played :" value={stats.tournamentsPlayed} />
					<StatCard title="Tournament won :" value={stats.tournamentsWon} />
				</div>
			</div>

			{/* Ligne 3 : Message de félicitations */}
			<div className="rounded-lg border border-cyan-500/30 bg-slate-900/50 p-6 text-center">
				<p className="font-pirulen text-lg tracking-wider text-cyan-400">
					Congratulations, you are better than {stats.percentile}% of players!
				</p>
			</div>
		</div>
	);
}
