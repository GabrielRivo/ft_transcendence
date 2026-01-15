import { createElement } from 'my-react';
import { Router } from 'my-react-router';

import { Home } from './pages/home';

import { NotFoundPage } from './pages/errors/notFoundPage';
import { MainLayout } from './layout/mainLayout';
// import { Game } from './pages/game';
import { ConnexionLayout } from './layout/connexionLayout';
import { Login } from './pages/login';
import { Register } from './pages/register';
import { Authentification } from './pages/authentification';
import { SetUsername } from './pages/set-username';
import { DashboardLayout } from './layout/dashboardLayout';
import { Dashboard } from './pages/dashboard';
import { MatchmakingPage } from './pages/matchmaking';
import { StatisticsPage } from './pages/statistics';
import { Game } from './pages/game';
import { GuestLayout } from './layout/GuestLayout';
import { AuthenticatedLayout } from './layout/AuthenticatedLayout';
import { SetUsernameLayout } from './layout/SetUsernameLayout';

const routes = [
	{
		layout: MainLayout,
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
								component: StatisticsPage,
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
				],
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
