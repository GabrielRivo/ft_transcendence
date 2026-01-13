import { createElement } from 'my-react';

export function UserItem({
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
