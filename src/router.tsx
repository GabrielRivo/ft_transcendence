import { createElement } from 'my-react';
import { Router } from 'my-react-router';

import { Test } from './pages/test';
import { NotFoundPage } from './pages/notFoundPage';
import { Home } from './pages/home';
import { MainLayout } from './layout/mainLayout';

const routes = [
	{
		layout: MainLayout,
		routes: [
			{
				path: '/',
				component: Home,
			},
			{
				path: '/test',
				component: Test,
			},
		],
	},
];

export default function App() {
	return <Router groups={routes} NoFound={<NotFoundPage />} />;
}
