import { createElement } from 'my-react';
import type { Element } from 'my-react';
import { Game } from '../pages/game';

export function MainLayout({ children }: { children: Element }) {
	return (
		<div className="bg-radial-primary flex h-screen w-screen items-center justify-center p-4 md:p-8">
			<div className="chamfer relative z-0 flex h-full w-full bg-white p-[2px]">
				<div className="chamfer bg-background-image relative z-10 h-full w-full">
					<div className="absolute inset-0 z-10 opacity-95">
						<Game />
					</div>
					<div className="absolute top-1/2 left-0 z-15 h-fit w-fit -translate-x-[1/2.5*calc(100%)] -translate-y-1/2 -rotate-90 rounded-b-lg bg-white p-5 mix-blend-screen">
						<h1 className="font-aquire text-primary text-2xl font-bold">FT_Transcendance</h1>
					</div>
					<div className="relative z-20 flex h-full w-full flex-col items-center justify-center">{children}</div>
				</div>
			</div>
		</div>
	);
}
