import { createElement } from 'my-react';
import type { Element } from 'my-react';
import { ChatSection } from '../components/section/chat/ChatSection';
import { Link, useNavigate, useRouter } from 'my-react-router';
import { useAuth } from '@/hook/useAuth';
import { useToast } from '@/hook/useToast';

function Info() {
	return <div className="flex h-4 w-full shrink-0 items-center justify-center"></div>;
}

function NavLink({ path, label, className = 'text-white/80' }: { path: string; label: string; className?: string }) {
	const router = useRouter();
	const isActive = router.path === path || router.path.startsWith(path + '/');

	return (
		<Link
			to={path}
			className={`font-pirulen relative px-4 py-2 text-sm tracking-widest transition-colors hover:text-white ${className}`}
		>
			{`${label}`}
			{isActive && <span className="absolute bottom-0 left-1/2 h-px w-6 -translate-x-1/2 bg-white" />}
		</Link>
	);
}

function Menu() {
	const { logout } = useAuth();
	const navigate = useNavigate();
	const { toast } = useToast();

	const handleLogout = () => {
		logout().then(() => {
			toast('Déconnexion réussie', 'success');
			navigate('/');
		});
	};

	return (
		<nav className="flex h-14 w-full shrink-0 items-center justify-center gap-8 pb-12">
			<NavLink path="/dashboard" label="Dashboard" />
			{/* <span>|</span> */}
			<NavLink path="/profile" label="Profile" />
			{/* <span>|</span> */}
			<NavLink path="/statistics" label="Stats" />
			{/* <span>|</span> */}
			<Link className="font-pirulen text-cyan-500 hover:text-white/80" to="/deconnexion" onClick={handleLogout}>
				Deconnexion
			</Link>
			{/* <NavLink path="/deconnexion" label="Deconnexion" className="text-cyan-500" /> */}
		</nav>
	);
}

export function DashboardLayout({ children }: { children: Element }) {
	return (
		<div className="flex size-full flex-col overflow-hidden text-white selection:bg-cyan-500/30">
			<Info />
			<div className="flex min-h-0 w-full flex-1 overflow-hidden p-8">
				<div className="grid size-full grid-cols-1 gap-6 md:grid-cols-12">
					<div className="h-full min-h-0 overflow-hidden md:col-span-7">
						<div className="size-full overflow-y-auto">{children}</div>
					</div>

					<div className="ff-dashboard-perspective flex h-full min-h-0 items-center justify-center perspective-[2000px] md:col-span-5">
						<ChatSection />
					</div>
				</div>
			</div>

			<Menu />
		</div>
	);
}
