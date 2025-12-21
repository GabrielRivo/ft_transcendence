import { createElement } from 'my-react';
import { Link } from 'my-react-router';

export function Test() {
	return (
		<div>
			<h1>This is a Test Page</h1>
			<Link to="/">Home</Link>
		</div>
	);
}
