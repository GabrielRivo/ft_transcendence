import { createElement, useState, useRef, useEffect, useMemo, Fragment } from 'my-react';
import { ChatMessage } from '../../../hook/useChat';
import { useAuth } from '../../../hook/useAuth';
import { useFriends } from '../../../hook/useFriends';
import { useOnlineUsers } from '../../../hook/useOnlineUsers';
import { useBlockedUsers } from '../../../hook/useBlockedUsers';
import { Modal } from '../../ui/modal';
import { Users } from '../../ui/icon/users';
import { TournamentInvite } from './TournamentInvite';

interface ChatMessagesPanelProps {
	messages: ChatMessage[];
	currentRoom: string;
	connected: boolean;
	onSendMessage: (content: string) => void;
	isGroup?: boolean;
	onInviteUser?: (userId: number) => void;
	onLeaveGroup?: () => void;
	onJoinTournament?: (tournamentId: string) => void;
}

export function ChatMessagesPanel({
	messages,
	currentRoom,
	connected,
	onSendMessage,
	isGroup = false,
	onInviteUser,
	onLeaveGroup,
	onJoinTournament
}: ChatMessagesPanelProps) {
	const { user } = useAuth();
	const { friends } = useFriends();
	const { getUser, fetchMissingUsers } = useOnlineUsers();
	const { isBlocked } = useBlockedUsers();
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const [inputValue, setInputValue] = useState('');
	const [showInviteModal, setShowInviteModal] = useState(false);
	const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
	const [revealedMessages, setRevealedMessages] = useState<Record<number, boolean>>({});

	// Collecter les userIds des messages pour lesquels on n'a pas d'info utilisateur
	const missingUserIds = useMemo(() => {
		const ids = new Set<number>();
		for (const msg of messages) {
			// Ignorer les messages système et l'utilisateur actuel
			if (msg.userId !== -1 && msg.userId !== user?.id && !getUser(msg.userId)) {
				ids.add(msg.userId);
			}
		}
		return Array.from(ids);
	}, [messages, user?.id, getUser]);

	// Fetch les profils des utilisateurs manquants quand les messages changent
	useEffect(() => {
		if (missingUserIds.length > 0) {
			fetchMissingUsers(missingUserIds);
		}
	}, [missingUserIds, fetchMissingUsers]);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages]);

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
			className="group shadow-neon-purple-low hover:shadow-neon-purple flex h-full min-h-0 flex-col overflow-hidden border border-purple-500/40 bg-slate-950/60 backdrop-blur-md transition-all duration-300 hover:-translate-y-2 hover:border-purple-400"
		>
			{/* Header */}
			<div className="flex shrink-0 justify-between border-b border-purple-500/20 bg-purple-500/10 p-4 text-sm font-bold tracking-widest text-purple-500">
				<span>{getRoomTitle()}</span>
				<div className="flex items-center gap-3">
					{isGroup && (
						<Fragment>
							<button
								onClick={() => setShowInviteModal(true)}
								className="rounded p-1 text-purple-400 transition-colors hover:bg-purple-500/20 hover:text-white"
								title="Add friends"
							>
								<Users size={18} />
							</button>
							<button
								onClick={onLeaveGroup}
								className="rounded px-2 py-1 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
								title="Quitter le groupe"
							>
								Quitter
							</button>
						</Fragment>
					)}
					<span className={`${connected ? 'animate-pulse text-green-500' : 'text-red-500'}`}>
						● {connected ? 'LIVE' : 'OFFLINE'}
					</span>
				</div>
			</div>
					
			{/* Messages */}
			<div
				ref={scrollRef}
				className="min-h-0 flex-1 overflow-y-auto p-2 font-mono text-xs text-purple-300 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-purple-500/50 hover:[&::-webkit-scrollbar-thumb]:bg-purple-400 [&::-webkit-scrollbar-track]:bg-slate-800/30"
				
			>
				{messages.length === 0 ? (
					<div className="flex h-full items-center justify-center text-gray-500">{user?.isGuest ? 'Please have an account to use all features' : 'No message'}</div>
				) : (
					<div className="flex flex-col gap-1">
						{messages.map((msg, index) => {
							const isOwn = msg.userId === user?.id;
							const isSystem = msg.userId === -1 || msg.username === 'System';
							const isBlockedUser = !isOwn && !isSystem && isBlocked(msg.userId);
							const isRevealed = revealedMessages[index] === true;
							const cachedUser = getUser(msg.userId);
							const displayUsername = isOwn 
								? (user?.username || cachedUser?.username || msg.username)
								: (cachedUser?.username || msg.username || `User #${msg.userId}`);
							
							const handleRevealMessage = () => {
								setRevealedMessages(prev => ({ ...prev, [index]: true }));
							};

							return (
								<div
									key={`${msg.created_at}-${index}`}
									className={`flex cursor-pointer flex-col gap-1 rounded border-b border-purple-500/10 px-1 py-1 transition-colors hover:bg-purple-500/20 hover:text-white ${isOwn ? 'bg-purple-500/10' : ''
										}`}
								>
									<div className="flex gap-2">
										<span className="opacity-50 select-none">[{formatTime(msg.created_at)}]</span>
										<span>
											{isSystem ? (
												<span className="font-bold text-yellow-400">SYSTEM</span>
											) : (
												<span className={`font-bold ${isOwn ? 'text-cyan-400' : ''} ${isBlockedUser ? 'text-gray-500' : ''}`}>{displayUsername}</span>
											)}
											{` >_`}
										</span>
									</div>
									<div className="wrap-break-word">
										{isBlockedUser && !isRevealed ? (
											<div
												onClick={handleRevealMessage}
												className="cursor-pointer select-none rounded bg-gray-800/50 px-2 py-1 text-gray-500 italic transition-colors hover:bg-gray-700/50 hover:text-gray-400"
											>
												<span className="blur-[3px]">Hidden message</span>
												<span className="ml-2 text-xs opacity-70">[Clic to reveal]</span>
											</div>
										) : (
											(() => {
												const joinMatch = msg.msgContent.match(/\[JOIN_TOURNAMENT:([a-zA-Z0-9-]+)\]/);
												if (joinMatch) {
													const tournamentId = joinMatch[1];
													const cleanContent = msg.msgContent.replace(/\[JOIN_TOURNAMENT:[a-zA-Z0-9-]+\]/, '');
													return (
														<div className="flex flex-col gap-2">
															<span className={isBlockedUser ? 'text-gray-400' : ''}>{cleanContent}</span>
															<TournamentInvite
																tournamentId={tournamentId}
																onJoin={(id) => {
																	if (onJoinTournament) onJoinTournament(id);
																}}
															/>
														</div>
													);
												}
												return <p className={isBlockedUser ? 'text-gray-400' : ''}>{msg.msgContent}</p>;
											})()
										)}
									</div>
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
					SEND
				</button>
			</form>

			{/* Invite Modal */}
			{showInviteModal && (
				<Modal
					title="Add friends"
					variant="purple"
					onClose={() => {
						setShowInviteModal(false);
						setSelectedUserIds([]);
					}}
				>
					<div className="flex flex-col gap-4">
						{friends.length === 0 ? (
							<p className="text-center text-gray-400">No friends to invite</p>
						) : (
							<div className="max-h-64 overflow-y-auto flex flex-col gap-1">
								{friends.map((friend) => {
									const isSelected = selectedUserIds.includes(friend.id);
									return (
										<label
											key={friend.id}
											className={`group flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all duration-200 ${isSelected
												? 'border-purple-500 bg-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
												: 'border-purple-500/20 bg-slate-900/50 hover:border-purple-500/50 hover:bg-purple-500/10'
												}`}
										>
											<div
												className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all duration-200 ${isSelected
													? 'border-purple-400 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
													: 'border-purple-500/50 bg-slate-900 group-hover:border-purple-400'
													}`}
											>
												{isSelected && (
													<svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
														<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
													</svg>
												)}
											</div>
											<input
												type="checkbox"
												checked={isSelected}
												onChange={(e: Event) => {
													const checked = (e.target as HTMLInputElement).checked;
													if (checked) {
														setSelectedUserIds((prev) => [...prev, friend.id]);
													} else {
														setSelectedUserIds((prev) => prev.filter((id) => id !== friend.id));
													}
												}}
												className="sr-only"
											/>
											<span className={`font-medium transition-colors ${isSelected ? 'text-purple-300' : 'text-gray-300 group-hover:text-white'}`}>
												{friend.username}
											</span>
										</label>
									);
								})}
							</div>
						)}
						<button
							onClick={() => {
								selectedUserIds.forEach((userId) => {
									if (onInviteUser) {
										onInviteUser(userId);
									}
								});
								setShowInviteModal(false);
								setSelectedUserIds([]);
							}}
							disabled={selectedUserIds.length === 0}
							className="w-full rounded bg-purple-500/20 px-4 py-2 text-sm font-bold text-purple-400 transition-colors hover:bg-purple-500/30 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Send
						</button>
					</div>
				</Modal>
			)}
		</div>
	);
}
