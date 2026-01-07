import { createElement } from 'my-react';
import { Router } from 'my-react-router';

import { Home } from './pages/home';

import { NotFoundPage } from './pages/errors/notFoundPage';
import { MainLayout } from './layout/mainLayout';
// import { Game } from './pages/game';
import { ConnexionLayout } from './layout/connexionLayout';
import { Login } from './pages/login';
import { Register } from './pages/register';
import { Connexion } from './pages/connexion';

const routes = [
	{
		layout: MainLayout,
		routes: [
			// {
			// 	path: '/game',
			// 	component: Game,
			// },
		],
	},
	{
		layout: MainLayout,
		routes: [
			{
				path: '/',
				component: Home,
			},
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
						path: '/connexion',
						component: Connexion,
					},
				],
			},
		],
	},
];

export default function App() {
	return <Router groups={routes} NoFound={<NotFoundPage />} />;
}
