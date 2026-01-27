import { render, createElement } from 'my-react';
import App from './router';
import './index.css';
import { ToastProvider } from './components/ui/toaster';
import { AuthProvider } from './context/AuthProvider';
import { OnlineUsersProvider } from './context/OnlineUsersProvider';
import { FriendsProvider } from './context/FriendsProvider';
import { BlockedUsersProvider } from './context/BlockedUsersProvider';

const root = document.getElementById('root');
if (root) {
	render(
		<AuthProvider>
			<OnlineUsersProvider>
				<FriendsProvider>
					<BlockedUsersProvider>
						<ToastProvider>
							<App />
						</ToastProvider>
					</BlockedUsersProvider>
				</FriendsProvider>
			</OnlineUsersProvider>
		</AuthProvider>,
		root as HTMLElement,
	);
} else {
	console.error('Element root not found!');
}
