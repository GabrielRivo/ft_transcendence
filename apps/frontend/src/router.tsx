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
import { OTP } from './pages/otp';
import { ForgotPassword } from './pages/forgot-password';
import { DashboardLayout } from './layout/dashboardLayout';
import { Dashboard } from './pages/dashboard';
import { MatchmakingPage } from './pages/matchmaking';
import { StatisticsPage } from './pages/statistics';
// import { StatisticsPageSlug } from './pages/statistics/slug';
import { StatisticsGeneralPage } from './pages/statistics/general';
import { StatisticsGeneralPageSlug } from './pages/statistics/general/slug';
import { StatisticsHistoryPage } from './pages/statistics/historic';
import { StatisticsHistoryPageSlug } from './pages/statistics/historic/slug';

import { Game } from './pages/game';
import { GuestLayout } from './layout/GuestLayout';
import { AuthenticatedLayout } from './layout/AuthenticatedLayout';
import { SetUsernameLayout } from './layout/SetUsernameLayout';
import { OTPLayout } from './layout/OTPLayout';
import { GameProvider } from './context/GameProvider';
import { ProfilePage } from './pages/profile';
import { ProfileSlugPage } from './pages/profile/slug';
import { LogoutPage } from './pages/logout';
import { PlayPage } from './pages/play';
import { OnlinePlayPage } from './pages/play/online';
import { LocalGame } from './pages/play/local';
import { TournamentPage } from './pages/play/tournament';
import { TournamentTypePage } from './pages/play/tournamentType';
import { TournamentPlayersPage } from './pages/play/tournamentPlayers';
import { StatisticsLayout } from './layout/StatisticsLayout';
import { StatisticsHistoryLayout } from './layout/StatisticsHistoricLayout';

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
							{
								path: '/forgot-password',
								component: ForgotPassword,
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
			// OTP verification route (for users with 2FA enabled but not verified)
			{
				layout: OTPLayout,
				routes: [
					{
						layout: ConnexionLayout,
						routes: [
							{
								path: '/otp',
								component: OTP,
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
								layout: StatisticsLayout,
								routes: [
									{
										path: '/statistics',
										component: StatisticsPage,
									},
									{
										path: '/statistics/general/:statsId',
										component: StatisticsGeneralPageSlug,
									},
									{
										path: '/statistics/general',
										component: StatisticsGeneralPage,
									},
									{
										layout: StatisticsHistoryLayout,
										routes: [
											{
												path: '/statistics/history/:statsId',
												component: StatisticsHistoryPageSlug,
											},
											{
												path: '/statistics/history',
												component: StatisticsHistoryPage,
											},
										],
									},
								],
							},
							{
								path: '/profile',
								component: ProfilePage,
							},
							{
								path: '/profile/:slug',
								component: ProfileSlugPage,
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
		],
	},
];

export default function App() {
	return <Router groups={routes} NoFound={<NotFoundPage />} />;
}
