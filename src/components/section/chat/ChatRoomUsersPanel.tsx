import { createElement } from 'my-react';
import { RoomUser } from '../../../hook/useChat';
import { useAuth } from '../../../hook/useAuth';

export function ChatRoomUsersPanel({ roomUsers, currentRoom }: { roomUsers: RoomUser[]; currentRoom: string }) {
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
