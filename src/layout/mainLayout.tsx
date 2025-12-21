import { createElement } from 'my-react';
import type { Element } from 'my-react';

export function MainLayout({ children }: { children: Element }) {
	return <div>{children}</div>;
}
