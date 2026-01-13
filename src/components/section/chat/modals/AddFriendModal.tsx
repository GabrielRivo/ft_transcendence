import { createElement, useState, createPortal } from 'my-react';
import { useAuth } from '../../../../hook/useAuth';
import { useFriends } from '../../../../hook/useFriends';

interface AddFriendModalProps {
	onClose: () => void;
}

export function AddFriendModal({ onClose }: AddFriendModalProps) {
	const { user } = useAuth();
	const { sendFriendInviteByUsername } = useFriends();
	const [username, setUsername] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		if (!username.trim() || !user) return;

		setLoading(true);
		setError(null);

		const result = await sendFriendInviteByUsername(username.trim());
		
		setLoading(false);
		
		if (result.success) {
			setSuccess(true);
			setTimeout(() => {
				onClose();
			}, 1500);
		} else {
			setError(result.message || "Impossible d'envoyer l'invitation");
		}
	};

	const handleBackdropClick = (e: Event) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	return createPortal(
		<div
			onClick={handleBackdropClick}
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
		>
			<div className="w-full max-w-md rounded-xl border border-cyan-500/30 bg-slate-900 p-6 shadow-2xl shadow-cyan-500/10">
				{/* Header */}
				<div className="mb-6 flex items-center justify-between">
					<h2 className="text-xl font-bold text-white">Ajouter un ami</h2>
					<button
						onClick={onClose}
						className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
					>
						<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				{success ? (
					<div className="flex flex-col items-center gap-4 py-8">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
							<svg className="h-8 w-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
						</div>
						<p className="text-green-400">Invitation envoyée !</p>
					</div>
				) : (
					<form onSubmit={handleSubmit}>
						<div className="mb-6">
							<label className="mb-2 block text-sm font-medium text-gray-300">
								Pseudo de l'utilisateur
							</label>
							<input
								type="text"
								value={username}
								onInput={(e: Event) => setUsername((e.target as HTMLInputElement).value)}
								placeholder="Entrez le pseudo..."
								className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-3 text-white placeholder-gray-500 outline-none transition-colors focus:border-cyan-500"
								autoFocus
							/>
							{error && (
								<p className="mt-2 text-sm text-red-400">{error}</p>
							)}
						</div>

						<div className="flex gap-3">
							<button
								type="button"
								onClick={onClose}
								className="flex-1 rounded-lg border border-white/10 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5"
							>
								Annuler
							</button>
							<button
								type="submit"
								disabled={loading || !username.trim()}
								className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 py-3 text-sm font-medium text-white transition-all hover:from-cyan-400 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{loading ? 'Envoi...' : 'Envoyer'}
							</button>
						</div>
					</form>
				)}
			</div>
		</div>,
		document.body,
	);
}

