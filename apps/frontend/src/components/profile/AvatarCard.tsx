import { createElement, useRef } from 'my-react';
import { AvatarCardProps } from './types';

export function AvatarCard({
	avatarPreview,
	username,
	onAvatarChange,
	isUploading,
	onAvatarDelete,
	isDeletingAvatar,
	canDeleteAvatar,
}: AvatarCardProps) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const handleAvatarClick = () => {
		fileInputRef.current?.click();
	};

	const handleDeleteClick = (e: MouseEvent) => {
		e.stopPropagation();
		if (onAvatarDelete && !isDeletingAvatar) {
			onAvatarDelete();
		}
	};

	return (
		<div className="rounded-lg border border-cyan-500/30 bg-slate-900/50 p-6">
			<h2 className="font-pirulen mb-4 text-xs tracking-wider text-cyan-500">AVATAR</h2>
			<div className="flex flex-col items-center gap-4">
				<div className="relative">
					<div
						onClick={handleAvatarClick}
						className="group relative h-32 w-32 cursor-pointer overflow-hidden rounded-full border-2 border-cyan-500/50 transition-all duration-300 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]"
					>
						{avatarPreview ? (
							<img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
						) : (
							<div className="flex h-full w-full items-center justify-center bg-slate-800 text-4xl text-cyan-400">
								{username?.[0]?.toUpperCase() || '?'}
							</div>
						)}
						<div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
							<span className="font-pirulen text-xs text-white">MODIFY</span>
						</div>
						{isUploading && (
							<div className="absolute inset-0 flex items-center justify-center bg-black/80">
								<div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
							</div>
						)}
					</div>
					{canDeleteAvatar && (
						<button
							onClick={handleDeleteClick}
							disabled={isDeletingAvatar}
							className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white transition-all duration-200 hover:bg-red-500 hover:shadow-[0_0_10px_rgba(239,68,68,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
							title="Supprimer l'avatar"
						>
							{isDeletingAvatar ? (
								<div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
							) : (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-4 w-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={2}
								>
									<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
								</svg>
							)}
						</button>
					)}
				</div>
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					onChange={onAvatarChange}
					className="hidden"
				/>
				<p className="text-center text-xs text-gray-500">Clic here for change</p>
			</div>
		</div>
	);
}

