import { createElement, useRef, useState } from 'my-react';
import type { Element } from 'my-react';
import { useChat, ChatMessage, RoomUser } from '../hook/useChat';
import { useFriends, Friend } from '../hook/useFriends';
import { useAuth } from '../hook/useAuth';
import { AddFriendModal } from '../components/section/chat/modals/AddFriendModal';
import { CreateGroupModal } from '../components/section/chat/modals/CreateGroupModal';

function Info() {
	return <div className="flex h-12 w-full shrink-0 items-center justify-center"></div>;
}

function Menu() {
	return <div className="flex h-10 w-full shrink-0 items-center justify-center"></div>;
}

function UserItem({
	name,
	isOnline,
	isSelected,
	onClick,
}: {
	key?: number | string;
	name: string;
	isOnline?: boolean;
	isSelected?: boolean;
	onClick?: () => void;
}) {
	return (
		<div
			onClick={onClick}
			className={`flex cursor-pointer flex-col items-center gap-2 transition-colors ${
				isSelected ? 'text-cyan-400' : 'hover:text-cyan-500'
			}`}
		>
			<div className="relative">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-lg font-bold">
					{name.charAt(0).toUpperCase()}
				</div>
				{isOnline !== undefined && (
					<div
						className={`absolute right-0 bottom-0 h-3 w-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}
					></div>
				)}
			</div>
			<span className="max-w-16 truncate text-center text-xs font-bold">{name}</span>
		</div>
	);
}

function ChatSidebarPanel({
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

// Composant Messages (CHAT > HUB)
function ChatMessagesPanel({
	messages,
	currentRoom,
	connected,
	onSendMessage,
}: {
	messages: ChatMessage[];
	currentRoom: string;
	connected: boolean;
	onSendMessage: (content: string) => void;
}) {
	const { user } = useAuth();
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const [inputValue, setInputValue] = useState('');

	const handleWheel = (e: WheelEvent) => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop += e.deltaY;
		}
	};

	const handleSubmit = (e: Event) => {
		e.preventDefault();
		if (inputValue.trim() && connected) {
			onSendMessage(inputValue);
			setInputValue('');
		}
	};

	const formatTime = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
	};

	const getRoomTitle = () => {
		if (currentRoom === 'hub') return 'CHAT > HUB';
		if (currentRoom.startsWith('room_') || currentRoom.startsWith('friend_')) return 'CHAT > PRIVÉ';
		return `CHAT > ${currentRoom.toUpperCase()}`;
	};

	return (
		<div
			onWheel={handleWheel}
			className="group flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-purple-500/40 bg-slate-950/60 shadow-[0_0_20px_rgba(168,85,247,0.15),inset_0_0_20px_rgba(168,85,247,0.05)] backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-purple-400 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]"
		>
			{/* Header */}
			<div className="flex shrink-0 justify-between border-b border-purple-500/20 bg-purple-500/10 p-4 text-sm font-bold tracking-widest text-purple-500">
				<span>{getRoomTitle()}</span>
				<span className={`${connected ? 'animate-pulse text-green-500' : 'text-red-500'}`}>
					● {connected ? 'LIVE' : 'OFFLINE'}
				</span>
			</div>

			{/* Messages */}
			<div
				ref={scrollRef}
				className="min-h-0 flex-1 overflow-y-auto p-2 font-mono text-xs text-purple-300 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-purple-500/50 hover:[&::-webkit-scrollbar-thumb]:bg-purple-400 [&::-webkit-scrollbar-track]:bg-slate-800/30"
			>
				{messages.length === 0 ? (
					<div className="flex h-full items-center justify-center text-gray-500">Aucun message</div>
				) : (
					<div className="flex flex-col gap-1">
						{messages.map((msg, index) => {
							const isOwn = msg.userId === user?.id;
							return (
								<div
									key={`${msg.created_at}-${index}`}
									className={`flex cursor-pointer flex-col gap-1 rounded border-b border-purple-500/10 px-1 py-1 transition-colors hover:bg-purple-500/20 hover:text-white ${
										isOwn ? 'bg-purple-500/10' : ''
									}`}
								>
									<div className="flex gap-2">
										<span className="opacity-50 select-none">[{formatTime(msg.created_at)}]</span>
										<span>
											<span className={`font-bold ${isOwn ? 'text-cyan-400' : ''}`}>{msg.username}</span>
											{` >_`}
										</span>
									</div>
									<p className="break-words">{msg.msgContent}</p>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Input */}
			<form onSubmit={handleSubmit} className="flex shrink-0 gap-2 border-t border-purple-500/20 bg-purple-500/5 p-3">
				<input
					type="text"
					value={inputValue}
					onInput={(e: Event) => setInputValue((e.target as HTMLInputElement).value)}
					placeholder={connected ? 'Message...' : 'Connexion...'}
					disabled={!connected}
					className="flex-1 rounded border border-purple-500/30 bg-slate-900/50 px-3 py-2 font-mono text-xs text-white placeholder-gray-500 transition-colors outline-none focus:border-purple-400 disabled:opacity-50"
				/>
				<button
					type="submit"
					disabled={!connected || !inputValue.trim()}
					className="rounded bg-purple-500/20 px-4 py-2 text-xs font-bold text-purple-400 transition-colors hover:bg-purple-500/30 disabled:cursor-not-allowed disabled:opacity-50"
				>
					ENVOYER
				</button>
			</form>
		</div>
	);
}

// Composant Room Users (TARGET)
function ChatRoomUsersPanel({ roomUsers, currentRoom }: { roomUsers: RoomUser[]; currentRoom: string }) {
	const { user } = useAuth();

	const getTitle = () => {
		if (currentRoom === 'hub') return 'Users';
		return 'EN LIGNE';
	};

	return (
		<div className="group h-full min-h-0 overflow-hidden rounded-xl border border-orange-500/40 bg-slate-950/60 shadow-[0_0_20px_rgba(249,115,22,0.15),inset_0_0_20px_rgba(249,115,22,0.05)] backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-orange-400 hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]">
			<div className="border-b border-orange-500/20 bg-orange-500/10 p-3 text-right text-sm font-bold tracking-widest text-orange-500">
				{getTitle()}
			</div>
			<div className="flex flex-col gap-3 overflow-y-auto p-4 text-xs [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-orange-500/50 [&::-webkit-scrollbar-track]:bg-slate-800/30">
				{roomUsers.length === 0 ? (
					<div className="text-center text-gray-500">Aucun utilisateur</div>
				) : (
					roomUsers.map((roomUser) => {
						const isCurrentUser = roomUser.userId === user?.id;
						return (
							<div
								key={roomUser.userId}
								className={`flex cursor-pointer flex-col items-center gap-2 transition-colors hover:text-orange-500 ${
									isCurrentUser ? 'text-orange-400' : 'text-orange-300'
								}`}
							>
								<div className="relative">
									<div
										className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${
											isCurrentUser ? 'bg-orange-500/30' : 'bg-slate-800'
										}`}
									>
										{roomUser.username.charAt(0).toUpperCase()}
									</div>
									<div className="absolute right-0 bottom-0 h-3 w-3 rounded-full bg-green-500"></div>
								</div>
								<span className="max-w-16 truncate text-center font-bold">
									{roomUser.username}
									{isCurrentUser && <span className="text-gray-500"> (vous)</span>}
								</span>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}

// Composant Chat principal
function Chat() {
	const { connected, currentRoom, messages, roomUsers, sendMessage, joinRoom, joinPrivateRoom } = useChat();
	const { friends, loading: friendsLoading } = useFriends();

	const handleSelectHub = () => {
		joinRoom('hub');
	};

	const handleSelectFriend = (friendId: number) => {
		joinPrivateRoom(friendId);
	};

	return (
		<div className="ff-dashboard-chat-safe grid h-full w-full origin-left -rotate-y-12 grid-cols-6 gap-4 p-4 transform-3d">
			{/* Sidebar - Amis/Groupes */}
			<div className="ff-dashboard-panel-enter ff-dashboard-panel-enter--delay-2 col-span-1 h-full min-h-0">
				<ChatSidebarPanel
					currentRoom={currentRoom}
					friends={friends}
					friendsLoading={friendsLoading}
					onSelectHub={handleSelectHub}
					onSelectFriend={handleSelectFriend}
				/>
			</div>

			{/* Messages */}
			<div className="ff-dashboard-panel-enter ff-dashboard-panel-enter--delay-1 col-span-4 h-full min-h-0">
				<ChatMessagesPanel
					messages={messages}
					currentRoom={currentRoom}
					connected={connected}
					onSendMessage={sendMessage}
				/>
			</div>

			{/* Room Users */}
			<div className="ff-dashboard-panel-enter ff-dashboard-panel-enter--delay-0 col-span-1 h-full min-h-0">
				<ChatRoomUsersPanel roomUsers={roomUsers} currentRoom={currentRoom} />
			</div>
		</div>
	);
}

export function DashboardLayout({ children }: { children: Element }) {
	return (
		<div className="flex h-full w-full flex-col overflow-hidden text-white selection:bg-cyan-500/30">
			<Info />
			<div className="flex min-h-0 w-full flex-1 overflow-hidden p-8">
				<div className="grid h-full w-full grid-cols-1 gap-6 md:grid-cols-12">
					<div className="h-full min-h-0 overflow-hidden md:col-span-7">
						<div className="h-full w-full overflow-y-auto">{children}</div>
					</div>

					<div className="ff-dashboard-perspective flex h-full min-h-0 items-center justify-center perspective-[2000px] md:col-span-5">
						<Chat />
					</div>
				</div>
			</div>

			<Menu />
		</div>
	);
}
