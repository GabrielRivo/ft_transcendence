import { createElement, useState, useEffect, createPortal, FragmentComponent, Element } from 'my-react';
import { Toast, ToastContext, ToastType } from './toasterContext';
import { Cross } from '@icon/cross';

interface ToastConfig {
	borderBg: string;
	glowColor: string;
	accentColor: string;
}

const toastConfigs: Record<ToastType, ToastConfig> = {
	success: {
		borderBg: 'bg-green-500',
		glowColor: 'shadow-neon-green-low',
		accentColor: 'bg-green-400',
	},
	error: {
		borderBg: 'bg-red-500',
		glowColor: 'shadow-[0_0_20px_rgba(239,68,68,0.15),inset_0_0_20px_rgba(239,68,68,0.05)]',
		accentColor: 'bg-red-400',
	},
	info: {
		borderBg: 'bg-cyan-500',
		glowColor: 'shadow-neon-cyan-low',
		accentColor: 'bg-cyan-400',
	},
	warning: {
		borderBg: 'bg-orange-500',
		glowColor: 'shadow-neon-orange-low',
		accentColor: 'bg-orange-400',
	},
};

const ToastItem = ({ toast, onClose }: { toast: Toast; onClose: (id: number) => void; key?: number | string }) => {
	useEffect(() => {
		const timer = setTimeout(() => {
			onClose(toast.id);
		}, toast.duration || 3000);

		return () => clearTimeout(timer);
	}, [toast.id, toast.duration, onClose]);

	const config = toastConfigs[toast.type];

	return (
		<div className="animate-toast-slide-up pointer-events-auto">
			{/* Bordure extérieure chamfered - crée l'effet de bordure */}
			<div className={`chamfer-br ${config.borderBg} ${config.glowColor} p-[2px]`}>
				{/* Contenu intérieur chamfered */}
				<div className="chamfer-br bg-slate-950/95 backdrop-blur-md">
					<div className="flex min-w-64 items-center gap-4 px-5 py-4">
						{/* Message */}
						<span className="flex-1 font-mono text-sm text-gray-200">{toast.message}</span>

						{/* Bouton fermer */}
						<button
							onClick={() => onClose(toast.id)}
							className="shrink-0 rounded p-1.5 text-gray-500 transition-all duration-200 hover:bg-white/10 hover:text-white"
						>
							<Cross />
						</button>
					</div>

					{/* Barre de progression */}
					<div className="h-0.5 w-full bg-slate-800">
						<div
							className={`animate-toast-progress h-full ${config.accentColor}`}
							style={{ animationDuration: `${toast.duration || 3000}ms` }}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

export const ToastProvider = ({ children }: { children?: Element }) => {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const addToast = (message: string, type: ToastType = 'info', duration: number = 3000) => {
		const id = Date.now();
		setToasts((prev) => [...prev, { id, message, type, duration }]);
	};

	const removeToast = (id: number) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	};

	return (
		<ToastContext.Provider value={{ toast: addToast }}>
			{children}
			{createPortal(
				<FragmentComponent>
					<div className="pointer-events-none fixed right-6 bottom-6 z-500 flex flex-col gap-3">
						{toasts.map((t) => (
							<ToastItem key={t.id} toast={t} onClose={removeToast} />
						))}
					</div>
				</FragmentComponent>,
				document.body,
			)}
		</ToastContext.Provider>
	);
};
