import { createElement, useState, useRef, useEffect, useCallback, FragmentComponent } from 'my-react';
import { UserContextMenu, UserContextMenuCallbacks, closeAllUserContextMenus } from '@ui/context-menu';
// import { useGame } from '@hook/useGame';

export interface UserItemProps {
	key?: number | string;
	name: string;
	avatar?: string | null;
	isOnline?: boolean;
	isSelected?: boolean;
	isFriend?: boolean;
	isBlocked?: boolean;
	isRightPanel?: boolean;
	onClick?: () => void;
	contextMenuCallbacks?: UserContextMenuCallbacks;
	className?: string;
}

export function UserItem({
	name,
	avatar,
	isOnline,
	isSelected,
	isFriend,
	isBlocked,
	isRightPanel = false,
	onClick,
	contextMenuCallbacks,
	className = '',
}: UserItemProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number }>({
		isOpen: false,
		x: 0,
		y: 0,
	});
	// const { mode } = useGame();


	// useEffect(() => {
	// 	if (mode === 'online') {
	// 		closeAllUserContextMenus();
	// 	}
	// 	return () => {
	// 		closeAllUserContextMenus();
	// 	}
	// }, [mode]);
	
	const handleContextMenu = useCallback(
		(e: MouseEvent) => {
			if (!contextMenuCallbacks) return;
			e.preventDefault();
			e.stopPropagation();
			// Fermer tous les autres menus contextuels avant d'ouvrir celui-ci
			closeAllUserContextMenus();
			// Petit délai pour laisser les autres menus se fermer
			setTimeout(() => {
				setContextMenu({
					isOpen: true,
					x: e.clientX,
					y: e.clientY,
				});
			}, 0);

			setTimeout(() => {
				closeAllUserContextMenus();
			}, 10000);
		},
		[contextMenuCallbacks],
	);

	// Utiliser un callback ref pour s'assurer que l'élément est capturé
	const setRef = useCallback(
		(element: HTMLDivElement | null) => {
			// Nettoyer l'ancien listener si présent
			if (containerRef.current) {
				containerRef.current.removeEventListener('contextmenu', handleContextMenu);
			}

			containerRef.current = element;

			// Ajouter le nouveau listener
			if (element && contextMenuCallbacks) {
				element.addEventListener('contextmenu', handleContextMenu);
			}
		},
		[handleContextMenu, contextMenuCallbacks],
	);

	useEffect(() => {
		return () => {
			setContextMenu({
				isOpen: false,
				x: 0,
				y: 0,
			});
			closeAllUserContextMenus();
		};
	}, []);
	// Cleanup au démontage
	useEffect(() => {
		return () => {
			if (containerRef.current) {
				containerRef.current.removeEventListener('contextmenu', handleContextMenu);
			}
		};
	}, [handleContextMenu]);

	const handleCloseContextMenu = () => {
		setContextMenu((prev) => ({ ...prev, isOpen: false }));
	};

	return (
		<FragmentComponent>
			<div
				ref={setRef}
				onClick={onClick}
				className={`flex cursor-pointer flex-col items-center gap-2 transition-colors ${
					isRightPanel ? 'text-red-400' : isSelected ? 'text-cyan-400' : 'hover:text-cyan-500`'
				}${className}`}
				
			>
				<div className="relative">
					{avatar ? (
						<img
							src={avatar}
							alt={name}
							className="size-12 rounded-full object-cover"
						/>
					) : (
						<div className="flex size-12 items-center justify-center rounded-full bg-slate-800 text-lg font-bold">
							{name.charAt(0).toUpperCase()}
						</div>
					)}
					{!isRightPanel && name !== 'Hub' && isOnline !== undefined && (
						<div
							className={`absolute right-0 bottom-0 size-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}
						></div>
					)}
				</div>
				<span className="max-w-16 truncate text-center text-xs font-bold">{name}</span>
			</div>

			{contextMenuCallbacks && contextMenu.isOpen && (
				<UserContextMenu
					isOpen={contextMenu.isOpen}
					position={{ x: contextMenu.x, y: contextMenu.y }}
					onClose={handleCloseContextMenu}
					isFriend={isFriend}
					isBlocked={isBlocked}
					callbacks={contextMenuCallbacks}
				/>
			)}
		</FragmentComponent>
	);
}
