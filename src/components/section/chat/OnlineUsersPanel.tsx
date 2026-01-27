import { createElement } from 'my-react';
import { useOnlineUsers } from '../../../hook/useOnlineUsers';
import { useAuth } from '../../../hook/useAuth';
import { useFriends } from '../../../hook/useFriends';
import { useBlockedUsers } from '../../../hook/useBlockedUsers';
import { UserItem } from './UserItem';
import { useNavigate } from 'my-react-router';
import { fetchWithAuth } from '@libs/fetchWithAuth';
import { useToast } from '@hook/useToast';

export function OnlineUsersPanel() {
	const { onlineUsers, loading } = useOnlineUsers();
	const { user } = useAuth();
	const { friends } = useFriends();
	const { isBlocked, blockUser, unblockUser } = useBlockedUsers();
	const navigate = useNavigate();
	const { toast } = useToast();

	const usersArray = Array.from(onlineUsers.values());

	return (
		<div className="group shadow-neon-red-low hover:shadow-neon-red h-full min-h-0 overflow-hidden rounded-e-lg border border-red-500/40 bg-slate-950/60 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-red-400">
			<div className="border-b border-red-500/20 bg-red-500/10 p-3 text-right text-sm font-bold tracking-widest text-red-500">
				Online ({usersArray.length})
			</div>
			<div className="flex flex-col gap-3 overflow-y-auto p-4 text-xs [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-red-500/50 [&::-webkit-scrollbar-track]:bg-slate-800/30">
				{loading ? (
					<div className="text-center text-gray-500">Chargement...</div>
				) : usersArray.length === 0 ? (
					<div className="text-center text-gray-500">No user</div>
				) : (
					usersArray.map((onlineUser) => {
						const isCurrentUser = onlineUser.userId === user?.id;
						if (isCurrentUser) {
							return (
								<UserItem
									key={onlineUser.userId}
									name={onlineUser.username}
									avatar={onlineUser.avatar}
									isOnline={true}
									isSelected={false}
									isRightPanel={true}
									onClick={() => {}}
									className="border-orange-500/50! bg-orange-950/30! text-orange-400! shadow-[0_0_10px_rgba(249,115,22,0.3)]"
								/>
							);
						}
						const isFriend = friends.some(f => f.id === onlineUser.userId);
						const userIsBlocked = isBlocked(onlineUser.userId);
						return (
							<UserItem
								key={onlineUser.userId}
								name={onlineUser.username}
								avatar={onlineUser.avatar}
								isOnline={true}
								isSelected={false}
								isRightPanel={true}
								isFriend={isFriend}
								isBlocked={userIsBlocked}
								onClick={() => {}}
								contextMenuCallbacks={{
									onChallenge: () => {
										fetchWithAuth(`/api/user/friend-management/challenge`, {
											method: 'POST',
											headers: {
												'Content-Type': 'application/json',
											},
											body: JSON.stringify({
												otherId: onlineUser.userId
											}),
										}).then(data => data.json()).then(data => {
											toast(data.message, data.success ? 'success' : 'error')
										}).catch(() => {
											toast('Network error', 'error')
										})
									},
									onInviteTournament: () => {
										console.log('Inviter au tournoi', onlineUser.username)
									},
									onStatistics: () => {
										navigate(`/statistics/general/${onlineUser.userId}`)
									},
									onProfile: () => {
										navigate(`/profile/${onlineUser.userId}`)
									},
									onToggleFriend: () => {
										fetchWithAuth(`/api/user/friend-management/invite`, {
											method: 'POST',
											headers: {
												'Content-Type': 'application/json',
											},
											body: JSON.stringify({
												otherId: onlineUser.userId
											}),
										}).then(data => data.json()).then(data => {
											toast(data.message, data.success ? 'success' : 'error')
										}).catch(() => {
											toast('Network error', 'error')
										})
									},
									onBlock: async () => {
										const success = await blockUser(onlineUser.userId);
										toast(success ? 'User blocked' : 'Failed to block user', success ? 'success' : 'error');
									},
									onUnblock: async () => {
										const success = await unblockUser(onlineUser.userId);
										toast(success ? 'User unblocked' : 'Failed to unblock user', success ? 'success' : 'error');
									},
								}}
							/>
						);
					})
				)}
			</div>
		</div>
	);
}
