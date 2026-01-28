import { createElement } from 'my-react';
import { RoomUser } from '../../../hook/useChat';
import { useAuth } from '../../../hook/useAuth';
import { UserItem } from './UserItem';
import { useNavigate } from 'my-react-router';
import { fetchWithAuth } from '@libs/fetchWithAuth';
import { useToast } from '@hook/useToast';

export function ChatRoomUsersPanel({ roomUsers, currentRoom }: { roomUsers: RoomUser[]; currentRoom: string }) {
	const { user } = useAuth();
	const navigate = useNavigate();
	const { toast } = useToast();
	const getTitle = () => {
		if (currentRoom === 'hub') return 'Users';
		return 'O';
	};

	return (
		<div className="group shadow-neon-red-low hover:shadow-neon-red h-full min-h-0 overflow-hidden rounded-e-lg border border-red-500/40 bg-slate-950/60 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-red-400">
			<div className="border-b border-red-500/20 bg-red-500/10 p-3 text-right text-sm font-bold tracking-widest text-red-500">
				{getTitle()}
			</div>
			<div className="flex flex-col gap-3 overflow-y-auto p-4 text-xs [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-red-500/50 [&::-webkit-scrollbar-track]:bg-slate-800/30">
				{roomUsers.length === 0 ? (
					<div className="text-center text-gray-500">No user</div>
				) : (
					roomUsers.map((roomUser) => {
						const isCurrentUser = roomUser.userId === user?.id;
						if (isCurrentUser) {
							return (
								<UserItem
									key={roomUser.userId}
									name={roomUser.username}
									isOnline={true}
									isSelected={false}
									isRightPanel={true}
									onClick={() => {}}
									className="border-orange-500/50! bg-orange-950/30! text-orange-400! shadow-[0_0_10px_rgba(249,115,22,0.3)]"
								/>
							);
						}
						return (
							<UserItem
								key={roomUser.userId}
								name={roomUser.username}
								isOnline={true}
								isSelected={false}
								isRightPanel={true}
								isFriend={false}
								onClick={() => {}}
								contextMenuCallbacks={{
									onChallenge: () => {
										fetchWithAuth(`/api/user/friend-management/challenge`, {
											method: 'POST',
											headers: {
												'Content-Type': 'application/json',
											},
											body: JSON.stringify({
												otherId: roomUser.userId
											}),
										}).then(data => data.json()).then(data => {
											toast(data.message, data.success ? 'success' : 'error', 3000)
										}).catch(e => {
											toast('Network error', 'error', 3000)
										})
										// console.log('Défier', roomUser.username)
									},
									onInviteTournament: () => {
										// console.log('Inviter au tournoi', roomUser.username)
									},
									onStatistics: () => {
										navigate(`/statistics/general/${roomUser.userId}`)
									},
									onProfile: () => {
										navigate(`/profile/${roomUser.userId}`)
										// console.log('Profil', roomUser.username)
									},
									onToggleFriend: () => {
										fetchWithAuth(`/api/user/friend-management/friend`, {
											method: 'DELETE',
											headers: {
												'Content-Type': 'application/json',
											},
											body: JSON.stringify({
												otherId: roomUser.userId
											}),
										}).then(data => data.json()).then(data => {
											toast(data.message, data.success ? 'success' : 'error', 3000)
										}).catch(e => {
											toast('Network error', 'error', 3000)
										})
									},
									onBlock: () => {
										fetchWithAuth(`/api/user/friend-management/block`, {
											method: 'POST',
											headers: {
												'Content-Type': 'application/json',
											},
											body: JSON.stringify({
												otherId: roomUser.userId
											}),
										}).then(data => data.json()).then(data => {
											toast(data.message, data.success ? 'success' : 'error', 3000)
										}).catch(e => {
											toast('Network error', 'error', 3000)
										})
										// console.log('Block', roomUser.username)
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
