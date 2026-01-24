import { createElement } from 'my-react';
import { Link, useParams, useRouter } from 'my-react-router';

export function StatisticsLayout({ children }: { children: Element }) {
	const params = useParams();
	const { path } = useRouter();
	const isGeneral = path.includes('/statistics/general');
	const isHistoric = path.includes('/statistics/historic');
	return (
		<div className="flex size-full flex-col overflow-hidden text-white">
			<header className="p-2 shrink-0">
				<h1 className="font-pirulen text-center text-6xl tracking-widest">Statistics</h1>
				<nav className="font-pirulen mt-8 flex justify-center gap-4 text-2xl tracking-widest">
					<Link
						to={params?.statsId ? `/statistics/general/${params.statsId}` : '/statistics/general'}
						className={`hover:text-cyan-500 ${isGeneral ? 'text-cyan-400' : ''}`}
					>
						General
					</Link>
					<span>|</span>
					<Link
						to={params?.statsId ? `/statistics/historic/${params.statsId}` : '/statistics/historic'}
						className={`hover:text-cyan-500 ${isHistoric ? 'text-cyan-400' : ''}`}
					>
						History
					</Link>
				</nav>
			</header>
			<main className="flex-1 w-full overflow-auto scrollbar-neon">{children}</main>
		</div>
	);
}
