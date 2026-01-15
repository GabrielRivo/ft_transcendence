import { createElement } from 'my-react';
import type { Element } from 'my-react';
import { Game } from '../pages/game';

export function MainLayout({ children }: { children: Element }) {
	return (
		<div className="bg-radial-primary flex size-full items-center justify-center overflow-hidden p-4 md:p-8">
			<div className="chamfer relative z-0 flex size-full bg-white p-[2px]">
				<div className="chamfer relative z-10 flex size-full flex-col overflow-hidden">
				<div className="absolute inset-0 z-10">
					<Game mode="background" />
				</div>
					<div className="absolute top-1/2 left-0 z-15 size-fit -translate-x-[1/2.5*calc(100%)] -translate-y-1/2 -rotate-90 rounded-b-lg bg-white p-5 mix-blend-screen">
						<h1 className="font-aquire text-primary text-2xl font-bold">FT_Transcendance</h1>
					</div>
					<div className="relative z-20 flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden">
						{children}
					</div>
				</div>
			</div>
		</div>
	);
}
