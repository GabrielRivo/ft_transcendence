import { render, createElement } from 'my-react';
import App from './router';
import './index.css';
import { ToastProvider } from './components/ui/toaster';
import { AuthProvider } from './context/AuthProvider';
import { FriendsProvider } from './context/FriendsProvider';

const root = document.getElementById('root');
if (root) {
	render(
		<AuthProvider>
			<FriendsProvider>
				<ToastProvider>
					<App />
				</ToastProvider>
			</FriendsProvider>
		</AuthProvider>,
		root as HTMLElement,
	);
} else {
	console.error('Element root not found!');
}
