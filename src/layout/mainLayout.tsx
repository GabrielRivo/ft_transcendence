import { createElement } from 'my-react';
import type { Element } from 'my-react';

export function MainLayout({ children }: { children: Element }) {
	return (
		<div className="bg-radial-primary flex h-screen w-screen items-center justify-center p-4 md:p-8">
			<div className="chamfer relative z-0 flex h-full w-full bg-white p-[2px]">
				<div className="chamfer bg-radial-primary relative z-10 flex h-full w-full flex-col items-center justify-center">
					{children}
				</div>
			</div>
		</div>
	);
}
