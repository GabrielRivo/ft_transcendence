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
		return 'EN LIGNE';
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
										
										console.log('Défier', roomUser.username)
									},
									onInviteTournament: () => {
										console.log('Inviter au tournoi', roomUser.username)
									},
									onStatistics: () => {
										navigate(`/statistics/${roomUser.userId}`)
									},
									onProfile: () => {
										navigate(`/profil/${roomUser.userId}`)
										console.log('Profil', roomUser.username)
									},
									onToggleFriend: () => {
										fetchWithAuth(`/api/social/friend-management/invite`, {
											method: 'POST',
											headers: {
												'Content-Type': 'application/json',
											},
											body: JSON.stringify({
												otherId: roomUser.userId
											}),
										}).then(data => data.json()).then(data => {
											toast(data.message, data.success ? 'success' : 'error')
										}).catch(e => {
											toast('Network error', 'error')
										})
										console.log('Ajouter en ami', roomUser.username)
									},
									onBlock: () => {
										fetchWithAuth(`/api/social/friend-management/block`, {
											method: 'POST',
											headers: {
												'Content-Type': 'application/json',
											},
											body: JSON.stringify({
												otherId: roomUser.userId
											}),
										}).then(data => data.json()).then(data => {
											toast(data.message, data.success ? 'success' : 'error')
										}).catch(e => {
											toast('Network error', 'error')
										})
										console.log('Bloquer', roomUser.username)
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
