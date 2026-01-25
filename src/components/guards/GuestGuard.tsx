import { createElement, useEffect, Element, FragmentComponent } from 'my-react';
import { useNavigate } from 'my-react-router';
import { useAuth } from '@hook/useAuth';
import { useToast } from '@hook/useToast';

interface GuestGuardProps {
	children?: Element;
}

export function GuestGuard({ children }: GuestGuardProps) {
	const { isAuthenticated, loading } = useAuth();
	const navigate = useNavigate();

	const { toast } = useToast();
	useEffect(() => {
		if (!loading && isAuthenticated) {
			toast(`You are already connected !`, 'error', 3000);
			navigate('/play');
		}
	}, [loading, isAuthenticated, navigate]);

	if (loading || isAuthenticated) {
		return (
			<div className="flex size-full items-center justify-center">
				<div className="size-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
			</div>
		);
	}

	return <FragmentComponent>{children}</FragmentComponent>;
}
