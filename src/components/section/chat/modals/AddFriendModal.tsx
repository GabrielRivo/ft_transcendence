import { createElement, useState } from 'my-react';
import { useAuth } from '@hook/useAuth';
import { useFriends } from '@hook/useFriends';
import { Modal } from '@ui/modal';
import { Check } from '@icon/check';

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
			setError(result.message || "Unable to send invitation");
		}
	};

	return (
		<Modal onClose={onClose} title="Add a friend" variant="cyan">
			{success ? (
				<div className="flex flex-col items-center gap-6 py-8">
					<div className="relative flex size-20 items-center justify-center">
						<div className="absolute inset-0 animate-ping rounded-full bg-green-500/20" />
						<div className="relative flex size-16 items-center justify-center rounded-full border-2 border-green-500/50 bg-green-500/10 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
							<Check className="size-8 text-green-400" />
						</div>
					</div>
					<p className="font-orbitron text-lg font-bold tracking-wider text-green-400">INVITATION SENT !</p>
				</div>
			) : (
				<form onSubmit={handleSubmit} className="flex flex-col gap-6">
					<div>
						<label className="mb-3 block font-mono text-xs font-bold tracking-widest text-cyan-400/80 uppercase">
							Username
						</label>
						<div className="relative">
							<span className="absolute top-1/2 left-4 -translate-y-1/2 font-mono text-cyan-500/50">@</span>
							<input
								type="text"
								value={username}
								onInput={(e: Event) => setUsername((e.target as HTMLInputElement).value)}
								placeholder="Enter nickname..."
								className="w-full rounded-lg border-2 border-cyan-500/30 bg-slate-900/80 py-3 pr-4 pl-9 font-mono text-sm text-white placeholder-gray-500 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)] transition-all duration-200 outline-none focus:border-cyan-400 focus:shadow-[inset_0_0_30px_rgba(6,182,212,0.2),0_0_20px_rgba(6,182,212,0.2)]"
								autoFocus
							/>
						</div>
						{error && (
							<div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
								<span className="font-mono text-xs text-red-400">⚠ {error}</span>
							</div>
						)}
					</div>

					<div className="flex gap-3">
						<button
							type="button"
							onClick={onClose}
							className="font-orbitron flex-1 rounded-lg border-2 border-gray-500/30 bg-gray-500/5 py-3 text-xs font-bold tracking-wider text-gray-400 transition-all duration-200 hover:border-gray-400/50 hover:bg-gray-500/10 hover:text-gray-300"
						>
							CANCEL
						</button>
						<button
							type="submit"
							disabled={loading || !username.trim()}
							className="font-orbitron flex-1 rounded-lg border-2 border-cyan-500/50 bg-cyan-500/20 py-3 text-xs font-bold tracking-wider text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all duration-200 hover:border-cyan-400 hover:bg-cyan-500/30 hover:text-white hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-cyan-500/50 disabled:hover:bg-cyan-500/20 disabled:hover:shadow-none"
						>
							{loading ? (
								<span className="flex items-center justify-center gap-2">
									<span className="size-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
									SENDING...
								</span>
							) : (
								'SEND'
							)}
						</button>
					</div>
				</form>
			)}
		</Modal>
	);
}
