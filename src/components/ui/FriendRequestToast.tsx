import { createElement, useState, useEffect, createPortal, FragmentComponent } from 'my-react';
import { useFriends, PendingInvitation } from '../../hook/useFriends';

interface FriendRequestToastItemProps {
	invitation: PendingInvitation;
	onAccept: (senderId: number, senderUsername: string) => void;
	onDecline: (senderId: number) => void;
	onClose: (senderId: number) => void;
}

function FriendRequestToastItem({ invitation, onAccept, onDecline, onClose }: FriendRequestToastItemProps) {
	const [loading, setLoading] = useState(false);

	const handleAccept = async () => {
		setLoading(true);
		await onAccept(invitation.senderId, invitation.senderUsername);
	};

	const handleDecline = async () => {
		setLoading(true);
		await onDecline(invitation.senderId);
	};

	return (
		<div className="animate-toast-slide-up pointer-events-auto w-80 transform rounded-xl border border-cyan-500/30 bg-slate-900 p-4 shadow-2xl shadow-cyan-500/10 transition-all hover:border-cyan-400/50">
			{/* Header */}
			<div className="mb-3 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="flex size-8 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-400">
						{invitation.senderUsername.charAt(0).toUpperCase()}
					</div>
					<div>
						<p className="text-sm font-medium text-white">{invitation.senderUsername}</p>
						<p className="text-xs text-gray-500">Friend request</p>
					</div>
				</div>
				<button
					onClick={() => onClose(invitation.senderId)}
					className="rounded p-1 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
				>
					<svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			{/* Actions */}
			<div className="flex gap-2">
				<button
					onClick={handleDecline}
					disabled={loading}
					className="flex-1 rounded-lg border border-white/10 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 disabled:opacity-50"
				>
					Refuse
				</button>
				<button
					onClick={handleAccept}
					disabled={loading}
					className="flex-1 rounded-lg bg-linear-to-r from-cyan-500 to-cyan-600 py-2 text-sm font-medium text-white transition-all hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-50"
				>
					{loading ? '...' : 'Accepter'}
				</button>
			</div>
		</div>
	);
}

export function FriendRequestToastContainer() {
	const { pendingInvitations, acceptFriendInvite, declineFriendInvite } = useFriends();
	const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

	// Clean up dismissedIds when new invitations arrive from previously dismissed senders
	useEffect(() => {
		const currentSenderIds = new Set(pendingInvitations.map((inv) => inv.senderId));
		setDismissedIds((prev) => {
			const newDismissed = new Set<number>();
			for (const id of prev) {
				// Only keep dismissed IDs that are still in pendingInvitations
				// This way, if someone sends a new invitation, it won't be filtered out
				if (!currentSenderIds.has(id)) {
					newDismissed.add(id);
				}
			}
			// Only update if there's a difference
			if (newDismissed.size !== prev.size) {
				return newDismissed;
			}
			return prev;
		});
	}, [pendingInvitations]);

	// Filter out dismissed invitations
	const visibleInvitations = pendingInvitations.filter((inv) => !dismissedIds.has(inv.senderId));

	const handleAccept = async (senderId: number, senderUsername: string) => {
		const success = await acceptFriendInvite(senderId, senderUsername);
		if (success) {
			setDismissedIds((prev) => new Set(prev).add(senderId));
		}
	};

	const handleDecline = async (senderId: number) => {
		const success = await declineFriendInvite(senderId);
		if (success) {
			setDismissedIds((prev) => new Set(prev).add(senderId));
		}
	};

	const handleClose = (senderId: number) => {
		setDismissedIds((prev) => new Set(prev).add(senderId));
	};

	if (visibleInvitations.length === 0) {
		return <FragmentComponent />;
	}

	return createPortal(
		<FragmentComponent>
			<div className="pointer-events-none fixed bottom-5 left-5 z-50 flex flex-col gap-3">
				{visibleInvitations.map((invitation) => {
					const itemProps = {
						invitation,
						onAccept: handleAccept,
						onDecline: handleDecline,
						onClose: handleClose,
						key: invitation.senderId,
					};
					return <FriendRequestToastItem {...itemProps} />;
				})}
			</div>
		</FragmentComponent>,
		document.body,
	);
}
