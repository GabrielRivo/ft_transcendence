import { createElement, useState } from 'my-react';
import { Friend } from '../../../hook/useFriends';
import { UserItem } from './UserItem';
import { AddFriendModal } from './modals/AddFriendModal';
import { CreateGroupModal } from './modals/CreateGroupModal';

export function ChatSidebarPanel({
	currentRoom,
	friends,
	friendsLoading,
	onSelectHub,
	onSelectFriend,
}: {
	currentRoom: string;
	friends: Friend[];
	friendsLoading: boolean;
	onSelectHub: () => void;
	onSelectFriend: (friendId: number) => void;
}) {
	const [showMenu, setShowMenu] = useState(false);
	const [showAddFriendModal, setShowAddFriendModal] = useState(false);
	const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

	const handleAddFriend = () => {
		setShowMenu(false);
		setShowAddFriendModal(true);
	};

	const handleCreateGroup = () => {
		setShowMenu(false);
		setShowCreateGroupModal(true);
	};

	return (
		<div className="group flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-cyan-500/40 bg-slate-950/60 shadow-[0_0_20px_rgba(6,182,212,0.15),inset_0_0_20px_rgba(6,182,212,0.05)] backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]">
			<div className="shrink-0 border-b border-cyan-500/20 bg-cyan-500/10 p-3 text-sm font-bold tracking-widest text-cyan-500">
				Chats
			</div>
			<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 font-mono text-xs text-cyan-300 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-500/50 [&::-webkit-scrollbar-track]:bg-slate-800/30">
				{/* Hub */}
				<div className="border-b border-cyan-500/20 pb-3">
					<div className="mb-2 text-[10px] text-gray-500 uppercase">Général</div>
					<UserItem name="Hub" isOnline={true} isSelected={currentRoom === 'hub'} onClick={onSelectHub} />
				</div>

				{/* Amis */}
				<div>
					<div className="mb-2 text-[10px] text-gray-500 uppercase">Amis</div>
					{friendsLoading ? (
						<div className="text-gray-500">Chargement...</div>
					) : friends.length === 0 ? (
						<div className="text-gray-500">Aucun ami</div>
					) : (
						<div className="flex flex-col gap-3">
							{friends.map((friend) => (
								<UserItem
									key={friend.id}
									name={friend.username}
									isOnline={true}
									isSelected={currentRoom.includes(String(friend.id))}
									onClick={() => onSelectFriend(friend.id)}
								/>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Add Button */}
			<div className="relative shrink-0 border-t border-cyan-500/20 p-3">
				<button
					onClick={() => setShowMenu(!showMenu)}
					className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-teal-500/20 text-sm font-bold tracking-wider text-cyan-400 transition-all hover:from-cyan-500/30 hover:to-teal-500/30"
				>
					<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
					</svg>
					ADD
				</button>

				{/* Dropdown Menu */}
				{showMenu && (
					<div className="absolute right-0 bottom-full left-0 mb-2 overflow-hidden rounded-lg border border-cyan-500/30 bg-slate-900 shadow-xl">
						<button
							onClick={handleAddFriend}
							className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-cyan-300 transition-colors hover:bg-cyan-500/10"
						>
							<svg className="h-5 w-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
								/>
							</svg>
							Add Friend
						</button>
						<button
							onClick={handleCreateGroup}
							className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-cyan-300 transition-colors hover:bg-cyan-500/10"
						>
							<svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
								/>
							</svg>
							Create Group
						</button>
					</div>
				)}
			</div>

			{/* Modals */}
			{showAddFriendModal && <AddFriendModal onClose={() => setShowAddFriendModal(false)} />}
			{showCreateGroupModal && <CreateGroupModal onClose={() => setShowCreateGroupModal(false)} />}
		</div>
	);
}
