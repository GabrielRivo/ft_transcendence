import { createElement, useState, useRef, useEffect, useCallback, FragmentComponent } from 'my-react';
import { UserContextMenu, UserContextMenuCallbacks, closeAllUserContextMenus } from '@ui/context-menu';

export interface UserItemProps {
	key?: number | string;
	name: string;
	isOnline?: boolean;
	isSelected?: boolean;
	isFriend?: boolean;
	isRightPanel?: boolean;
	onClick?: () => void;
	contextMenuCallbacks?: UserContextMenuCallbacks;
}

export function UserItem({
	name,
	isOnline,
	isSelected,
	isFriend,
	isRightPanel = false,
	onClick,
	contextMenuCallbacks,
}: UserItemProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number }>({
		isOpen: false,
		x: 0,
		y: 0,
	});

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
					isRightPanel ? 'text-red-400' : isSelected ? 'text-cyan-400' : 'hover:text-cyan-500'
				}`}
			>
				<div className="relative">
					<div className="flex size-12 items-center justify-center rounded-full bg-slate-800 text-lg font-bold">
						{name.charAt(0).toUpperCase()}
					</div>
					{!isRightPanel && isOnline !== undefined && (
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
					callbacks={contextMenuCallbacks}
				/>
			)}
		</FragmentComponent>
	);
}
