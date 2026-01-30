import { createElement, useState } from 'my-react';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/hook/useToast';
import { DeleteAccountModalProps } from '../types';

export function DeleteAccountModal({ onClose, onConfirmDelete, isDeleting }: DeleteAccountModalProps) {
	const { toast } = useToast();
	const [deleteConfirmText, setDeleteConfirmText] = useState('');

	const handleDelete = async () => {
		if (deleteConfirmText !== 'DELETE') {
			toast('Please type DELETE to confirm', 'warning', 1000);
			return;
		}
		await onConfirmDelete();
	};

	return (
		<Modal onClose={onClose} title="Delete the account" variant="purple">
			<div className="space-y-4">
				<p className="text-sm text-red-400">
					Warning! This action will permanently delete your account and all your data.
				</p>
				<div className="space-y-2">
					<label className="text-xs text-gray-500">
						Tap <span className="font-bold text-white">DELETE</span> for confirmation
					</label>
					<input
						type="text"
						value={deleteConfirmText}
						onInput={(e: Event) => setDeleteConfirmText((e.target as HTMLInputElement).value)}
						placeholder="DELETE"
						className="w-full rounded-sm border border-red-500/30 bg-transparent p-3 text-center text-white outline-none focus:border-red-500"
						maxlength={6}
					/>
				</div>
				<button
					onClick={handleDelete}
					disabled={deleteConfirmText !== 'DELETE' || isDeleting}
					className="w-full rounded-sm border border-red-500 bg-red-500/20 py-3 text-sm font-bold text-red-400 transition-all duration-300 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isDeleting ? 'Deletion...' : 'Permanently delete my account'}
				</button>
			</div>
		</Modal>
	);
}

