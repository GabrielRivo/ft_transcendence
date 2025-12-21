import { createElement } from 'my-react';
import { Link } from 'my-react-router';

export function NotFoundPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-800 text-center text-white">
			<div>
				<h1 className="m-0 text-9xl">404</h1>
				<h2 className="mt-4 text-3xl">Page non trouvée</h2>
				<p className="mt-4 text-xl text-gray-400">Oups! La page que vous cherchez n'existe pas.</p>
				<Link
					to="/"
					className="mt-8 inline-block rounded-lg bg-blue-600 px-8 py-4 font-bold text-white no-underline transition-colors hover:bg-blue-700"
				>
					← Retour à l'accueil
				</Link>
			</div>
		</div>
	);
}
