import { createElement } from 'my-react';
import { Link } from 'my-react-router';

export function Home() {
	return (
		<div className="text-neon-blue">
			<h1>Welcome to the Home Page</h1>
			<Link to="/test" className="text-neon-pink">
				Test
			</Link>
		</div>
	);
}
