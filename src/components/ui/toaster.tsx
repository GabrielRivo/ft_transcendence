import {
	createElement,
	createContext,
	useState,
	useContext,
	useEffect,
	createPortal,
	FragmentComponent,
	Element,
} from 'my-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
	id: number;
	message: string;
	type: ToastType;
	duration?: number;
}

export interface ToastContextType {
	toast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = (): ToastContextType => {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error('useToast must be used within a ToastProvider');
	}
	return context as ToastContextType;
};

const ToastItem = ({ toast, onClose }: { toast: Toast; onClose: (id: number) => void; key?: number | string }) => {
	useEffect(() => {
		const timer = setTimeout(() => {
			onClose(toast.id);
		}, toast.duration || 3000);

		return () => clearTimeout(timer);
	}, [toast.id, toast.duration, onClose]);

	const bgColors = {
		success: 'bg-green-500',
		error: 'bg-red-500',
		info: 'bg-blue-500',
		warning: 'bg-yellow-500',
	};

	return (
		<div
			className={`${bgColors[toast.type]} animate-toast-slide-up pointer-events-auto flex min-w-[200px] transform items-center justify-between rounded px-6 py-3 text-white shadow-lg transition-all hover:scale-105`}
		>
			<span>{toast.message}</span>
			<button
				onClick={() => onClose(toast.id)}
				className="ml-4 font-bold text-white hover:text-gray-200 focus:outline-none"
			>
				×
			</button>
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
				<>
					<style>{`
            @keyframes toastSlideUp {
              from {
                opacity: 0;
                transform: translateY(100%);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            .animate-toast-slide-up {
              animation: toastSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>
					{/* Conteneur fixé en bas à droite */}
					<div className="pointer-events-none fixed right-5 bottom-5 z-50 flex flex-col gap-3">
						{toasts.map((t) => (
							<ToastItem key={t.id} toast={t} onClose={removeToast} />
						))}
					</div>
				</>,
				document.body,
			)}
		</ToastContext.Provider>
	);
};
