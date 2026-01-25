import { createElement, FragmentComponent, createPortal, Element, useEffect, useRef } from 'my-react';
import { Cross } from '@icon/cross';

interface ModalProps {
	onClose: () => void;
	children?: Element;
	title?: string | false;
	variant?: 'cyan' | 'purple';
}

interface ModalHeaderProps {
	title: string | false;
	onClose: () => void;
	variant: 'cyan' | 'purple';
}

interface ModalContentProps {
	children?: Element | Element[];
	variant: 'cyan' | 'purple';
}

function ModalContent({ children, variant }: ModalContentProps) {
	const borderColor = variant === 'cyan' ? 'border-cyan-500/50' : 'border-purple-500/50';
	const shadowColor =
		variant === 'cyan'
			? 'shadow-[0_0_40px_rgba(6,182,212,0.3),inset_0_0_60px_rgba(6,182,212,0.05)]'
			: 'shadow-[0_0_40px_rgba(168,85,247,0.3),inset_0_0_60px_rgba(168,85,247,0.05)]';
	const glowColor = variant === 'cyan' ? 'hover:border-cyan-400' : 'hover:border-purple-400';
	const hoverShadow =
		variant === 'cyan'
			? 'hover:shadow-[0_0_60px_rgba(6,182,212,0.5),inset_0_0_80px_rgba(6,182,212,0.1)]'
			: 'hover:shadow-[0_0_60px_rgba(168,85,247,0.5),inset_0_0_80px_rgba(168,85,247,0.1)]';

	// Stop propagation on both mousedown AND click to prevent backdrop from closing
	const handleStopPropagation = (e: MouseEvent) => {
		e.stopPropagation();
	};

	return (
		<div
			onMouseDown={handleStopPropagation}
			onClick={handleStopPropagation}
			className={`w-full max-w-md overflow-hidden rounded-xl border-2 ${borderColor} bg-slate-950/90 backdrop-blur-xl pointer-events-auto ${shadowColor} ${glowColor} ${hoverShadow} animate-modal-enter transition-all duration-300`}
		>
			{children}
		</div>
	);
}

function ModalHeader({ title, onClose, variant }: ModalHeaderProps) {
	const bgColor = variant === 'cyan' ? 'bg-cyan-500/10' : 'bg-purple-500/10';
	const borderColor = variant === 'cyan' ? 'border-cyan-500/30' : 'border-purple-500/30';
	const textColor = variant === 'cyan' ? 'text-cyan-400' : 'text-purple-400';
	const hoverBg = variant === 'cyan' ? 'hover:bg-cyan-500/20' : 'hover:bg-purple-500/20';

	const handleClose = (e: MouseEvent) => {
		console.log('[Modal] X button clicked!', e);
		e.preventDefault();
		e.stopPropagation();
		if (onClose) {
			console.log('[Modal] Calling onClose...');
			onClose();
			console.log('[Modal] onClose called');
		} else {
			console.error('[Modal] onClose is undefined!');
		}
	};

	return (
		<div className={`flex items-center justify-between border-b ${borderColor} ${bgColor} px-6 py-4`}>
			<h2 className={`font-orbitron text-lg font-bold tracking-wider ${textColor} uppercase`}>{title}</h2>
			<button
				onClick={handleClose}
				className={`rounded-lg p-2 text-gray-400 transition-all duration-200 ${hoverBg} hover:rotate-90 hover:text-white`}
			>
				<Cross />
			</button>
		</div>
	);
}

function ModalBody({ children }: { children?: Element | Element[] }) {
	return <div className="p-6">{children}</div>;
}

// Export Modal using a manual container to ensure cleanup on unmount
export function Modal({ onClose, children, title = false, variant = 'cyan' }: ModalProps) {
	const containerRef = useRef<HTMLElement | null>(null);

	// Create container once
	if (!containerRef.current) {
		containerRef.current = document.createElement('div');
	}

	const onCloseRef = useRef(onClose);
	useEffect(() => {
		onCloseRef.current = onClose;
	}, [onClose]);

	useEffect(() => {
		const container = containerRef.current;
		if (container) {
			document.body.appendChild(container);

			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.key === 'Escape') {
					e.preventDefault();
					e.stopPropagation();
					onCloseRef.current();
				}
			};

			document.addEventListener('keydown', handleKeyDown, true);

			return () => {
				document.removeEventListener('keydown', handleKeyDown, true);
				if (document.body.contains(container)) {
					document.body.removeChild(container);
				}
			};
		}
	}, []);

	const handleBackdropClick = (e: MouseEvent) => {
		if (e.target === e.currentTarget) {
			e.preventDefault();
			e.stopPropagation();
			onClose();
		}
	};

	if (!containerRef.current) return null;

	return createPortal(
		<div
			onClick={handleBackdropClick}
			className="animate-backdrop-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto"
		>
			<ModalContent variant={variant}>
				{title && <ModalHeader title={title} onClose={onClose} variant={variant} />}
				<ModalBody>{children}</ModalBody>
			</ModalContent>
		</div>,
		containerRef.current,
	);
}
