import { createElement } from 'my-react';
import { Modal } from '@ui/modal';
import { UserAdd } from '@icon/user-add';
import { Users } from '@icon/users';

interface AddModalProps {
	onClose: () => void;
	handleAddFriend: () => void;
	handleCreateGroup: () => void;
}

export function AddModal({ onClose, handleAddFriend, handleCreateGroup }: AddModalProps) {
	return (
		<Modal onClose={onClose} title="New chat" variant="cyan">
			<div className="flex flex-col gap-3">
				<button
					onClick={handleAddFriend}
					className="group relative flex w-full items-center gap-4 overflow-hidden rounded-lg border-2 border-cyan-500/30 bg-cyan-500/5 px-5 py-4 text-left transition-all duration-300 hover:border-cyan-400/60 hover:bg-cyan-500/15 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]"
				>
					<div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-cyan-500/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
					<div className="relative flex size-12 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 transition-all duration-300 group-hover:border-cyan-400 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]">
						<UserAdd className="size-6 text-cyan-400 transition-transform duration-300 group-hover:scale-110" />
					</div>
					<div className="relative flex flex-col gap-1">
						<span className="font-orbitron text-sm font-bold tracking-wider text-cyan-300 transition-colors group-hover:text-cyan-200">
							ADD FRIEND
						</span>
						<span className="font-mono text-xs text-gray-500 transition-colors group-hover:text-gray-400">
							Send an invitation to a user
						</span>
					</div>
				</button>

				<button
					onClick={handleCreateGroup}
					className="group relative flex w-full items-center gap-4 overflow-hidden rounded-lg border-2 border-purple-500/30 bg-purple-500/5 px-5 py-4 text-left transition-all duration-300 hover:border-purple-400/60 hover:bg-purple-500/15 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]"
				>
					<div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-purple-500/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
					<div className="relative flex size-12 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 transition-all duration-300 group-hover:border-purple-400 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]">
						<Users className="size-6 text-purple-400 transition-transform duration-300 group-hover:scale-110" />
					</div>
					<div className="relative flex flex-col gap-1">
						<span className="font-orbitron text-sm font-bold tracking-wider text-purple-300 transition-colors group-hover:text-purple-200">
							CREATE GROUP
						</span>
						<span className="font-mono text-xs text-gray-500 transition-colors group-hover:text-gray-400">
							Start a group conversation
						</span>
					</div>
				</button>
			</div>
		</Modal>
	);
}
