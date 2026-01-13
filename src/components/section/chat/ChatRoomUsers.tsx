import { createElement, useState } from 'my-react';
import { RoomUser } from '../../../hook/useChat';
import { useAuth } from '../../../hook/useAuth';
import { AddFriendModal } from './modals/AddFriendModal';
import { CreateGroupModal } from './modals/CreateGroupModal';

interface ChatRoomUsersProps {
	roomUsers: RoomUser[];
	currentRoom: string;
}

export function ChatRoomUsers({ roomUsers, currentRoom }: ChatRoomUsersProps) {
	const { user } = useAuth();
	const [showMenu, setShowMenu] = useState(false);
	const [showAddFriendModal, setShowAddFriendModal] = useState(false);
	const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

	const getRoomTitle = () => {
		if (currentRoom === 'hub') return 'Dans le Hub';
		if (currentRoom.startsWith('room_') || currentRoom.startsWith('friend_')) return 'Dans la conversation';
		return 'Connectés';
	};

	const handleAddFriend = () => {
		setShowMenu(false);
		setShowAddFriendModal(true);
	};

	const handleCreateGroup = () => {
		setShowMenu(false);
		setShowCreateGroupModal(true);
	};

	return (
		<div className="flex h-full flex-col border-l border-white/10 bg-slate-900/50">
			{/* Header */}
			<div className="border-b border-white/10 p-3">
				<h3 className="font-pirulen text-xs tracking-wider text-orange-500">{getRoomTitle()}</h3>
				<p className="mt-1 text-xs text-gray-500">
					{roomUsers.length} utilisateur{roomUsers.length > 1 ? 's' : ''}
				</p>
			</div>

			{/* User List */}
			<div className="flex-1 overflow-y-auto p-2">
				{roomUsers.length === 0 ? (
					<p className="px-2 py-4 text-center text-sm text-gray-500">Aucun utilisateur</p>
				) : (
					<div className="space-y-1">
						{roomUsers.map((roomUser) => {
							const isCurrentUser = roomUser.userId === user?.id;
							return (
								<div
									key={roomUser.userId}
									className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
										isCurrentUser ? 'bg-cyan-500/10' : 'hover:bg-white/5'
									}`}
								>
									{/* Avatar */}
									<div
										className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
											isCurrentUser
												? 'bg-cyan-500/30 text-cyan-400'
												: 'bg-gray-700 text-gray-300'
										}`}
									>
										{roomUser.username.charAt(0).toUpperCase()}
									</div>

									{/* User Info */}
									<div className="flex-1 truncate">
										<p
											className={`text-sm truncate ${
												isCurrentUser ? 'text-cyan-400' : 'text-gray-300'
											}`}
										>
											{roomUser.username}
											{isCurrentUser && (
												<span className="ml-1 text-xs text-gray-500">(vous)</span>
											)}
										</p>
									</div>

									{/* Online indicator */}
									<div className="h-2 w-2 rounded-full bg-green-500"></div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Add Button */}
			<div className="relative border-t border-white/10 p-3">
				<button
					onClick={() => setShowMenu(!showMenu)}
					className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-sm font-medium text-cyan-400 transition-all hover:from-cyan-500/30 hover:to-purple-500/30"
				>
					<svg
						className="h-5 w-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 4v16m8-8H4"
						/>
					</svg>
					Ajouter
				</button>

				{/* Dropdown Menu */}
				{showMenu && (
					<div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-lg border border-white/10 bg-slate-800 shadow-xl">
						<button
							onClick={handleAddFriend}
							className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-300 transition-colors hover:bg-white/5"
						>
							<svg className="h-5 w-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
							</svg>
							Ajouter un ami
						</button>
						<button
							onClick={handleCreateGroup}
							className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-300 transition-colors hover:bg-white/5"
						>
							<svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
							</svg>
							Créer un groupe
						</button>
					</div>
				)}
			</div>

			{/* Modals */}
			{showAddFriendModal && (
				<AddFriendModal onClose={() => setShowAddFriendModal(false)} />
			)}
			{showCreateGroupModal && (
				<CreateGroupModal onClose={() => setShowCreateGroupModal(false)} />
			)}
		</div>
	);
}
