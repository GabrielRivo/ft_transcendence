import { useContext } from 'my-react';
import { ToastContext, ToastContextType } from '../components/ui/toasterContext';

export const useToast = (): ToastContextType => {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error('useToast must be used within a ToastProvider');
	}
	return context as ToastContextType;
};
