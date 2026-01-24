import { createElement, useEffect, Element, FragmentComponent } from 'my-react';
import { useNavigate } from 'my-react-router';
import { useAuth } from '@hook/useAuth';
import { useToast } from '@hook/useToast';

interface AuthGuardProps {
	children?: Element;
}

export function AuthGuard({ children }: AuthGuardProps) {
	const { isAuthenticated, user, loading } = useAuth();
	const navigate = useNavigate();
	const { toast } = useToast();

	useEffect(() => {
		if (!loading && !isAuthenticated) {
			toast(`You must be logged in to access this page!`, 'error', 3000);
			navigate('/login');
			return;
		}

		// Si l'utilisateur est authentifié mais n'a pas de username
		// et n'est pas déjà sur la page set-username
		const currentPath = window.location.pathname;
		if (!loading && isAuthenticated && user?.noUsername && currentPath !== '/set-username') {
			toast(`You don't have a username yet. !`, 'error', 3000);
			navigate('/set-username');
		}
	}, [loading, isAuthenticated, user?.noUsername, navigate]);

	if (loading || !isAuthenticated) {
		return (
			<div className="flex size-full items-center justify-center">
				<div className="size-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
			</div>
		);
	}

	return <FragmentComponent>{children}</FragmentComponent>;
}
