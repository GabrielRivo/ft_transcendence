import { createElement } from 'my-react';
import { useAuth } from '../../hook/useAuth';
import { useNavigate } from 'my-react-router';
import { useToast } from '../../hook/useToast';
import { ButtonStyle3 } from '../../components/ui/button/style3';

export function Dashboard() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const { toast } = useToast();

	const handleLogout = () => {
		logout().then(() => {
			toast('Déconnexion réussie', 'success', 3000);
			navigate('/');
		});
	};

	const handleMatchmaking = () => {
		navigate('/matchmaking');
	};

	return (
		<div className="flex h-full flex-col gap-6 p-6 text-white">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-pirulen text-2xl tracking-widest">Dashboard</h1>
					{user && (
						<p className="mt-2 text-cyan-400">
							Welcome, <span className="font-bold">{user.username || user.email}</span>
						</p>
					)}
				</div>
				<ButtonStyle3 onClick={handleLogout}>logout</ButtonStyle3>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<div className="rounded-lg border border-cyan-500/30 bg-slate-900/50 p-6">
					<h2 className="font-pirulen mb-2 text-sm tracking-wider text-cyan-500">STATISTICS</h2>
					<p className="text-gray-400">Your gaming stats will appear here</p>
				</div>

				<div
					onClick={handleMatchmaking}
					className="group cursor-pointer rounded-lg border border-purple-500/30 bg-slate-900/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]"
				>
					<h2 className="font-pirulen mb-2 text-sm tracking-wider text-purple-500 transition-colors group-hover:text-purple-400">
						MATCHMAKING
					</h2>
					<p className="text-gray-400">Find quick game.</p>
					<div className="mt-4 flex items-center gap-2 text-xs text-purple-400 opacity-0 transition-opacity group-hover:opacity-100">
						<span>Clic to play</span>
						<span>→</span>
					</div>
				</div>

				<div className="rounded-lg border border-orange-500/30 bg-slate-900/50 p-6">
					<h2 className="font-pirulen mb-2 text-sm tracking-wider text-orange-500">Friends</h2>
					<p className="text-gray-400">Manage your friend list.</p>
				</div>
			</div>
		</div>
	);
}
