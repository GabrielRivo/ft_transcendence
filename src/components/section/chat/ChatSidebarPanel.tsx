import { createElement, useState } from 'my-react';
import { Friend } from '../../../hook/useFriends';
import { Group } from '../../../hook/useGroups';
import { useOnlineUsers } from '../../../hook/useOnlineUsers';
import { useBlockedUsers } from '../../../hook/useBlockedUsers';
import { UserItem } from './UserItem';
import { GroupItem } from './GroupItem';
import { AddFriendModal } from './modals/AddFriendModal';
import { CreateGroupModal } from './modals/CreateGroupModal';
import { AddModal } from './modals/AddModal';
import { Add } from '@icon/add';
import { useNavigate } from 'my-react-router';
import { useToast } from '@hook/useToast'; 
import { fetchWithAuth } from '@libs/fetchWithAuth';
import { useAuth } from '@/hook/useAuth';

interface ChatSidebarPanelProps {
	currentRoom: string;
	friends: Friend[];
	friendsLoading: boolean;
	groups: Group[];
	groupsLoading: boolean;
	onSelectHub: () => void;
	onSelectFriend: (friendId: number) => void;
	onSelectGroup: (groupId: number) => void;
	onRemoveFriend: (friendId: number) => Promise<boolean>;
}

export function ChatSidebarPanel({
	currentRoom,
	friends,
	friendsLoading,
	groups,
	groupsLoading,
	onSelectHub,
	onSelectFriend,
	onSelectGroup,
	onRemoveFriend,
}: ChatSidebarPanelProps) {
	const { isOnline, getUser } = useOnlineUsers();
	const { isBlocked, blockUser, unblockUser } = useBlockedUsers();
	const [showMenu, setShowMenu] = useState(false);
	const [showAddFriendModal, setShowAddFriendModal] = useState(false);
	const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
	const { toast } = useToast()
	const { user } = useAuth();
	
	const navigate = useNavigate();
	const handleAddFriend = () => {
		setShowMenu(false);
		setShowAddFriendModal(true);
	};

	const handleCreateGroup = () => {
		setShowMenu(false);
		setShowCreateGroupModal(true);
	};

	return (
		<div className="group shadow-neon-cyan-low hover:shadow-neon-cyan flex h-full min-h-0 flex-col overflow-hidden rounded-s-lg border border-cyan-500/40 bg-slate-950/60 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-cyan-400">
			<div className="shrink-0 border-b border-cyan-500/20 bg-cyan-500/10 p-3 text-sm font-bold tracking-widest text-cyan-500">
				Chats
			</div>
			<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 font-mono text-xs text-cyan-300 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-500/50 [&::-webkit-scrollbar-track]:bg-slate-800/30">
				{/* Hub */}
				<div className="border-b border-cyan-500/20 pb-3">
					<div className="mb-2 text-[10px] text-gray-500 uppercase">General</div>
					{!user?.isGuest && (
						<UserItem name="Hub" isOnline={true} isSelected={currentRoom === 'hub'} onClick={onSelectHub} />
					)}
				</div>

				{/* Groupes */}
				<div className="border-b border-cyan-500/20 pb-3">
					<div className="mb-2 text-[10px] text-gray-500 uppercase">Groups</div>
					{groupsLoading ? (
						<div className="text-gray-500">Loading...</div>
					) : groups.length === 0 ? (
						<div className="text-gray-500">No groups</div>
					) : (
						<div className="flex flex-col gap-3">
							{groups.map((group) => (
								<GroupItem
									key={group.groupId}
									name={group.name}
									isSelected={currentRoom === `group_${group.groupId}`}
									onClick={() => onSelectGroup(group.groupId)}
								/>
							))}
						</div>
					)}
				</div>

				{/* Amis */}
				<div>
					<div className="mb-2 text-[10px] text-gray-500 uppercase">Friends</div>
					{friendsLoading ? (
						<div className="text-gray-500">Loading...</div>
					) : friends.length === 0 ? (
						<div className="text-gray-500">No friends</div>
					) : (
						<div className="flex flex-col gap-3">
							{friends.map((friend) => {
								// Utiliser le cache OnlineUsers pour le statut, le username et l'avatar à jour
								const onlineUser = getUser(friend.id);
								const friendIsOnline = isOnline(friend.id);
								const displayName = onlineUser?.username || friend.username;
								const displayAvatar = onlineUser?.avatar || null;
								const friendIsBlocked = isBlocked(friend.id);
								
								return (
								<UserItem
									key={friend.id}
									name={displayName}
									avatar={displayAvatar}
									isOnline={friendIsOnline}
									isFriend={true}
									isBlocked={friendIsBlocked}
									isSelected={currentRoom.includes(String(friend.id))}
									onClick={() => onSelectFriend(friend.id)}
									contextMenuCallbacks={{
										onChallenge: () => {
											fetchWithAuth(`/api/user/friend-management/challenge`, {
												method: 'POST',
												headers: {
													'Content-Type': 'application/json',
												},
												body: JSON.stringify({
													otherId: friend.id
												}),																	
											}).then(data => data.json()).then(data => {
												toast(data.message, data.success ? 'success' : 'error', 3000)
											}).catch(() => {
												toast('Network error', 'error', 3000)
											})
											console.log('Défier', friend.username)
										},
										onInviteTournament: () => {
											console.log('Inviter au tournoi', friend.username)
										},
										onStatistics: () => {
											navigate(`/statistics/${friend.id}`)
										},
										onProfile: () => {
											navigate(`/profile/${friend.id}`)
											console.log('Profil', friend.username)
										},
										onToggleFriend: async () => {
											const success = await onRemoveFriend(friend.id);
											if (success) {
												toast('Friend removed successfully', 'success', 3000);
											} else {
												toast('Failed to remove friend', 'error', 3000);
											}
											console.log('Delete friend', friend.username)
										},
										onBlock: async () => {
											const success = await blockUser(friend.id);
											toast(success ? 'User blocked' : 'Failed to block user', success ? 'success' : 'error', 3000);
										},
										onUnblock: async () => {
											const success = await unblockUser(friend.id);
											toast(success ? 'User unblocked' : 'Failed to unblock user', success ? 'success' : 'error', 3000);
										},
									}}
								/>
								);
							})}
						</div>
					)}
				</div>
			</div>

			{/* Add Button */}
			<div className="relative shrink-0 border-t border-cyan-500/20 p-3">
				<button
					onClick={() => setShowMenu(!showMenu)}
					disabled={user?.isGuest || false}
					className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-linear-to-r from-cyan-500/20 to-teal-500/20 text-sm font-bold tracking-wider text-cyan-400 transition-all hover:from-cyan-500/30 hover:to-teal-500/30"
				>
					<Add className="text-cyan-400" />
					ADD
				</button>
			</div>

			{/* Modals */}
			{showMenu && (
				<AddModal
					onClose={() => setShowMenu(false)}
					handleAddFriend={handleAddFriend}
					handleCreateGroup={handleCreateGroup}
				/>
			)}
			{showAddFriendModal && <AddFriendModal onClose={() => setShowAddFriendModal(false)} />}
			{showCreateGroupModal && <CreateGroupModal onClose={() => setShowCreateGroupModal(false)} />}
		</div>
	);
}
