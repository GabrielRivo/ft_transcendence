import { createElement } from 'my-react';
import { Router } from 'my-react-router';

import { Home } from './pages/home';

import { NotFoundPage } from './pages/errors/notFoundPage';
import { MainLayout } from './layout/mainLayout';
import { ConnexionLayout } from './layout/connexionLayout';
import { Login } from './pages/login';
import { Register } from './pages/register';
import { Authentification } from './pages/authentification';
import { SetUsername } from './pages/set-username';
import { DashboardLayout } from './layout/dashboardLayout';
import { Dashboard } from './pages/dashboard';
import { MatchmakingPage } from './pages/matchmaking';
import { StatisticsPage } from './pages/statistics';
import { StatisticsPageSlug } from './pages/statistics/slug';
import { Game } from './pages/game';
import { GuestLayout } from './layout/GuestLayout';
import { AuthenticatedLayout } from './layout/AuthenticatedLayout';
import { SetUsernameLayout } from './layout/SetUsernameLayout';
import { GameProvider } from './context/GameProvider';
import { ProfilePage } from './pages/profile';
import { LogoutPage } from './pages/logout';
import { PlayPage } from './pages/play';
import { OnlinePlayPage } from './pages/play/online';
import { LocalGame } from './pages/play/local';
import { TournamentPage } from './pages/play/tournament';
import { TournamentTypePage } from './pages/play/tournamentType';
import { TournamentPlayersPage } from './pages/play/tournamentPlayers';

function GameLayout({ children }: { children: any }) {
	return (
		<GameProvider>
			<MainLayout>{children}</MainLayout>
		</GameProvider>
	);
}

const routes = [
	{
		layout: GameLayout,
		routes: [
			{
				path: '/',
				component: Home,
			},
			// Guest-only routes (login, register, etc.)
			{
				layout: GuestLayout,
				routes: [
					{
						layout: ConnexionLayout,
						routes: [
							{
								path: '/login',
								component: Login,
							},
							{
								path: '/register',
								component: Register,
							},
							{
								path: '/authentification',
								component: Authentification,
							},
						],
					},
				],
			},
			// Set username route (for users without username)
			{
				layout: SetUsernameLayout,
				routes: [
					{
						layout: ConnexionLayout,
						routes: [
							{
								path: '/set-username',
								component: SetUsername,
							},
						],
					},
				],
			},
			// Authenticated routes
			{
				layout: AuthenticatedLayout,
				routes: [
					{
						layout: DashboardLayout,
						routes: [
							{
								path: '/dashboard',
								component: Dashboard,
							},
							{
								path: '/statistics/:statsId',
								component: StatisticsPageSlug,
							},
							{
								path: '/statistics',
								component: StatisticsPage,
							},
							{
								path: '/profile',
								component: ProfilePage,
							},
							{
								path: '/play',
								component: PlayPage,
							},
							{
								path: '/online',
								component: OnlinePlayPage,
							},
							{
								path: '/play/tournament',
								component: TournamentPage,
							},
							{
								path: '/play/tournament/:tournamentType',
								component: TournamentTypePage,
							},
							{
								path: '/play/tournament/:tournamentType/:playersCount',
								component: TournamentPlayersPage,
							},
						],
					},
					{
						path: '/matchmaking',
						component: MatchmakingPage,
					},
					{
						path: '/game',
						component: Game,
					},
					{
						path: '/local',
						component: LocalGame,
					},
				],
			},
			{
				path: '/logout',
				component: LogoutPage,
			},
			// {
			// 	path: '/game',
			// 	component: Game,
			// },
		],
	},
];

export default function App() {
	return <Router groups={routes} NoFound={<NotFoundPage />} />;
}
