import { createElement, useState } from 'my-react';
import { Link, useNavigate } from 'my-react-router';
import { ButtonStyle4 } from '@/components/ui/button/style4';
import { Modal } from '@/components/ui/modal';
import { useAuth } from '@/hook/useAuth';
import { useToast } from '@/hook/useToast';
import { tournamentSocket } from '@libs/socket';

export function OnlinePlayPage() {
	const navigate = useNavigate();
	const { user } = useAuth();
	const { toast } = useToast();

	const [showInviteModal, setShowInviteModal] = useState(false);
	const [inviteCode, setInviteCode] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const handleClickMatchmaking = () => {
		navigate('/matchmaking');
	};

	const handleClickLocal = () => {
		navigate('/local');
	};

	const handleJoinWithCode = async (e: Event) => {
		e.preventDefault();

		if (inviteCode.length !== 6 || !/^\d+$/.test(inviteCode)) {
			toast('Please enter a valid 6-digit code', 'error');
			return;
		}

		setIsLoading(true);

		try {
			const response = await fetch('/api/tournament/guest/join', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ otp: Number(inviteCode) }),
			});

			if (response.status === 201) {
				const data = await response.json();
				setShowInviteModal(false);
				setInviteCode('');
				const tournamentType = data.visibility?.toLowerCase() || 'public'; // Default to public if undefined, though it should be there
				const playersCount = data.size;
				if (!tournamentSocket.connected) {
					// console.log('[TournamentGuest] Connecting tournament socket...');
					tournamentSocket.connect();
				}
				navigate(`/play/tournament/${tournamentType}/${playersCount}?id=${data.id}`);
			} else {
				const errorData = await response.json().catch(() => ({}));
				toast(errorData.message || 'Failed to join tournament', 'error');
			}
		} catch {
			toast('An error occurred while joining', 'error');
		} finally {
			setIsLoading(false);
		}
	};

	const handleCloseModal = () => {
		setShowInviteModal(false);
		setInviteCode('');
	};

	return( <div className="flex flex-col items-center justify-center h-full gap-24">
			<h2 className="text-6xl font-bold text-white font-pirulen tracking-widest">Play</h2>
			<div className="flex flex-col gap-8 ">
				<ButtonStyle4 disabled={user?.isGuest} onClick={handleClickMatchmaking} className="text-2xl">Matchmaking</ButtonStyle4>
				{/* <ButtonStyle4 disabled={user?.isGuest} onClick={handleClickLocal} className="text-2xl">Challenge a Friend</ButtonStyle4> */}
				<ButtonStyle4 disabled={user?.isGuest}onClick={() => navigate('/play/tournament')} className="text-2xl">Tournament</ButtonStyle4>
				{user?.isGuest && <ButtonStyle4 onClick={() => setShowInviteModal(true)} className="text-2xl">Join Tournament with Code</ButtonStyle4>}
				<Link to="/play"  className="text-white text-center font-pirulen font-bold tracking-widest hover:text-neon-blue text-lg">Return</Link>
			</div>

		{showInviteModal && (
			<Modal onClose={handleCloseModal} title="Invite Code">
				<form className="flex flex-col gap-6 p-6" onSubmit={handleJoinWithCode}>
					<div className="group flex flex-col gap-2">
						<label
							htmlFor="invite-code"
							className="font-pirulen text-xs tracking-wider text-gray-400 transition-colors group-focus-within:text-white"
						>
							Code
						</label>
						<input
							type="text"
							id="invite-code"
							name="invite-code"
							value={inviteCode}
							onInput={(e: Event) => setInviteCode((e.target as HTMLInputElement).value)}
							className="focus:border-neon-blue w-full rounded-sm border border-white/10 bg-transparent p-3 text-center text-2xl tracking-[0.5em] text-white transition-all duration-300 outline-none placeholder:text-gray-600 focus:bg-white/5"
							placeholder="000000"
							maxLength={6}
							autoFocus
						/>
						<p className="text-xs text-gray-500">Enter the 6-digit invite code</p>
					</div>
					<div className="flex justify-end gap-3">
						<ButtonStyle4 type="button" onClick={handleCloseModal}>
							Cancel
						</ButtonStyle4>
						<ButtonStyle4 type="submit" disabled={isLoading}>
							{isLoading ? 'Joining...' : 'Join'}
						</ButtonStyle4>
					</div>
				</form>
			</Modal>
		)}
	</div>);
}
