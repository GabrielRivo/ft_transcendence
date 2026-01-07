import { render, createElement } from 'my-react';
import App from './router';
import './index.css';
import { ToastProvider } from './components/ui/toaster';

const root = document.getElementById('root');
if (root) {
	render(
		<ToastProvider>
			<App />
		</ToastProvider>,
		root as HTMLElement,
	);
} else {
	console.error('Element root not found!');
}
