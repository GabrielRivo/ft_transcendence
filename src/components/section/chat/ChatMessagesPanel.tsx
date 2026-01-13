import { createElement, useState, useRef } from 'my-react';
import { ChatMessage } from '../../../hook/useChat';
import { useAuth } from '../../../hook/useAuth';

export function ChatMessagesPanel({
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
