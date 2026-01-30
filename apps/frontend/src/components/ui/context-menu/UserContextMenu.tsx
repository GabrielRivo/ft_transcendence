import { createElement, createPortal, useEffect, useState } from 'my-react';

// Événement global pour fermer tous les menus contextuels
const CLOSE_ALL_CONTEXT_MENUS_EVENT = 'closeAllUserContextMenus';

export function closeAllUserContextMenus() {
	document.dispatchEvent(new CustomEvent(CLOSE_ALL_CONTEXT_MENUS_EVENT));
}

export interface UserContextMenuCallbacks {
	onChallenge?: () => void;
	onStatistics?: () => void;
	onProfile?: () => void;
	onToggleFriend?: () => void;
	onBlock?: () => void;
	onUnblock?: () => void;
}

export interface UserContextMenuProps {
	isOpen: boolean;
	position: { x: number; y: number };
	onClose: () => void;
	isFriend?: boolean;
	isBlocked?: boolean;
	callbacks: UserContextMenuCallbacks;
}

interface MenuItemProps {
	// icon: string;
	label: string;
	onClick?: () => void;
	variant?: 'default' | 'danger';
}

function MenuItem({  label, onClick, variant = 'default' }: MenuItemProps) {
	const handleClick = (e: MouseEvent) => {
		e.stopPropagation();
		if (onClick) onClick();
	};

	const variantClasses =
		variant === 'danger'
			? 'text-red-400 hover:bg-red-500/20 hover:text-red-300'
			: 'text-gray-300 hover:bg-cyan-500/20 hover:text-cyan-300';

	return (
		<button
			onClick={handleClick}
			className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-all duration-150 ${variantClasses}`}
		>
			<span className="font-medium">{label}</span>
		</button>
	);
}

function Divider() {
	return <div className="my-1 h-px bg-cyan-500/20"></div>;
}

export function UserContextMenu({ isOpen, position, onClose, isFriend = false, isBlocked = false, callbacks }: UserContextMenuProps) {
	const [adjustedPosition, setAdjustedPosition] = useState(position);
	// const menuIdRef = useRef(Math.random().toString(36).substr(2, 9));

	useEffect(() => {
		if (!isOpen) return;

		// Ajuster la position si le menu dépasse de l'écran
		const menuWidth = 200;
		const menuHeight = 280;
		const padding = 10;

		let x = position.x;
		let y = position.y;

		if (x + menuWidth + padding > window.innerWidth) {
			x = window.innerWidth - menuWidth - padding;
		}
		if (y + menuHeight + padding > window.innerHeight) {
			y = window.innerHeight - menuHeight - padding;
		}

		setAdjustedPosition({ x, y });
	}, [isOpen, position]);

	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = () => {
			onClose();
		};

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};

		const handleScroll = () => {
			onClose();
		};

		// Écouter l'événement global de fermeture
		const handleCloseAll = () => {
			onClose();
		};

		document.addEventListener(CLOSE_ALL_CONTEXT_MENUS_EVENT, handleCloseAll);
		document.addEventListener('keydown', handleEscape);
		document.addEventListener('scroll', handleScroll, true);

		// Délai pour éviter de fermer immédiatement
		const timeout = setTimeout(() => {
			document.addEventListener('click', handleClickOutside);
			document.addEventListener('contextmenu', handleClickOutside);
		}, 10);

		return () => {
			clearTimeout(timeout);
			document.removeEventListener(CLOSE_ALL_CONTEXT_MENUS_EVENT, handleCloseAll);
			document.removeEventListener('click', handleClickOutside);
			document.removeEventListener('contextmenu', handleClickOutside);
			document.removeEventListener('keydown', handleEscape);
			document.removeEventListener('scroll', handleScroll, true);
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const handleMenuClick = (e: MouseEvent) => {
		e.stopPropagation();
	};

	const handleAction = (action?: () => void) => {
		if (action) action();
		onClose();
	};

	return createPortal(
		<div
			onClick={handleMenuClick}
			onContextMenu={(e: MouseEvent) => e.preventDefault()}
			className="animate-context-menu-enter fixed z-100 min-w-[180px] overflow-hidden rounded-lg border border-cyan-500/30 bg-slate-950/95 shadow-[0_0_20px_rgba(6,182,212,0.2)] backdrop-blur-xl"
			style={`left: ${adjustedPosition.x}px; top: ${adjustedPosition.y}px;`}
		>
			<div className="py-1">
				{/* <MenuItem label="Challenge" onClick={() => handleAction(callbacks.onChallenge)} /> */}
				<Divider />
				<MenuItem label="Stats" onClick={() => handleAction(callbacks.onStatistics)} />
				<MenuItem label="Profile" onClick={() => handleAction(callbacks.onProfile)} />
				<Divider />
				<MenuItem
					label={isFriend ? 'Remove friends': 'Add as friend'}
					onClick={() => handleAction(callbacks.onToggleFriend)}
				/>
				<MenuItem 
					label={isBlocked ? 'Unblock' : 'Block'} 
					onClick={() => handleAction(isBlocked ? callbacks.onUnblock : callbacks.onBlock)} 
					variant="danger" 
				/>
			</div>
		</div>,
		document.body,
	);
}
