import { createElement, useState } from 'my-react';
import { ButtonStyle4 } from '../../components/ui/button/style4';
import { Discord } from '@icon/discord';
import { Github } from '@icon/github';
import { useNavigate } from 'my-react-router';
import { useAuth } from '../../hook/useAuth';
import { useToast } from '../../hook/useToast';

const API_BASE = '/api/auth';

export function Authentification() {
	const navigate = useNavigate();
	const { loginAsGuest } = useAuth();
	const { toast } = useToast();

	const [showGuestForm, setShowGuestForm] = useState(false);
	const [guestUsername, setGuestUsername] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	const handleOAuthLogin = (provider: 'github' | 'discord') => {
		window.location.href = `${API_BASE}/${provider}/redirect/uri`;
	};

	const handleGuestSubmit = async (e: Event) => {
		e.preventDefault();
		setError('');

		if (guestUsername.trim().length < 3) {
			setError('Username must be at least 3 characters');
			return;
		}

		if (guestUsername.trim().length > 20) {
			setError('Username must be at most 20 characters');
			return;
		}

		setIsLoading(true);

		try {
			const success = await loginAsGuest(guestUsername.trim());

			if (success) {
				toast('Connected as guest', 'success');
				navigate('/play');
			} else {
				setError('Username already exists');
				toast('Username already taken', 'error');
			}
		} catch {
			setError('An error occurred');
			toast('An error has occurred', 'error');
		} finally {
			setIsLoading(false);
		}
	};

	if (showGuestForm) {
		return (
			<div className="flex flex-col items-center gap-8 text-white">
				<h1 className="font-aquire text-2xl font-bold">Guest Mode</h1>
				<p className="text-s font-orbitron">Choose a username to play as guest</p>
				<form className="flex min-w-2/3 flex-col gap-4" onSubmit={handleGuestSubmit}>
					<div className="group flex flex-col gap-2">
						<label
							htmlFor="guestUsername"
							className="font-pirulen text-xs tracking-wider text-gray-400 transition-colors group-focus-within:text-white"
						>
							Username
						</label>
						<input
							type="text"
							id="guestUsername"
							name="guestUsername"
							value={guestUsername}
							onInput={(e: Event) => setGuestUsername((e.target as HTMLInputElement).value)}
							className={`focus:border-neon-blue w-full rounded-sm border bg-transparent p-3 text-sm text-white transition-all duration-300 outline-none placeholder:text-gray-600 focus:bg-white/5 ${error ? 'border-red-500' : 'border-white/10'}`}
							placeholder="GuestPlayer123"
							autoFocus
						/>
						{error && <span className="text-xs text-red-400">{error}</span>}
						<p className="text-xs text-gray-500">3-20 characters</p>
					</div>
					<ButtonStyle4 type="submit" disabled={isLoading}>
						{isLoading ? 'Connecting...' : 'Play as Guest'}
					</ButtonStyle4>
					<ButtonStyle4 onClick={() => setShowGuestForm(false)}>
						Back
					</ButtonStyle4>
				</form>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center gap-8 text-white">
			<h1 className="font-aquire text-2xl font-bold">Authentification</h1>
			<p className="text-s font-orbitron">Log in to your account to access your personal space.</p>
			<div className="flex min-w-2/3 flex-col gap-2">
				<ButtonStyle4 onClick={() => navigate('/login')}>Log in</ButtonStyle4>
				<ButtonStyle4 onClick={() => navigate('/register')}>Create an account</ButtonStyle4>
			</div>
			<div className="flex w-full items-center gap-2">
				<hr className="w-full" />
				<span>OU</span>
				<hr className="w-full" />
			</div>
			<div className="flex min-w-2/3 flex-col gap-2">
				<ButtonStyle4 onClick={() => handleOAuthLogin('github')}>
					<div className="flex w-full items-center gap-2">
						<Github size={20} className="text-white" /> <span>Github</span>
					</div>
				</ButtonStyle4>
				<ButtonStyle4 onClick={() => handleOAuthLogin('discord')}>
					<div className="flex w-full items-center gap-2">
						<Discord size={20} className="text-white" /> <span>Discord</span>
					</div>
				</ButtonStyle4>
			</div>
			<div className="flex w-full items-center gap-2">
				<hr className="w-full" />
				<span>OU</span>
				<hr className="w-full" />
			</div>
			<div className="flex min-w-2/3 flex-col gap-2">
				<ButtonStyle4 onClick={() => setShowGuestForm(true)}>
					Play as Guest
				</ButtonStyle4>
			</div>
		</div>
	);
}
