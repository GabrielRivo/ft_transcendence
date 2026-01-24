import { createElement, useEffect, Element, FragmentComponent } from 'my-react';
import { useNavigate } from 'my-react-router';
import { useAuth } from '@hook/useAuth';
import { useToast } from '@hook/useToast';

interface SetUsernameGuardProps {
	children?: Element;
}

/**
 * Guard pour la page set-username
 * - Redirige vers /login si non authentifié
 * - Redirige vers /play si l'utilisateur a déjà un username
 */
export function SetUsernameGuard({ children }: SetUsernameGuardProps) {
	const { isAuthenticated, user, loading } = useAuth();
	const navigate = useNavigate();
	const { toast } = useToast();

	useEffect(() => {
		if (!loading) {
			if (!isAuthenticated) {
				toast(`You must be logged in to set a nickname !`, 'error', 3000);
				navigate('/login');
				return;
			}

			// Si l'utilisateur a déjà un username, rediriger vers dashboard
			if (!user?.noUsername) {
				toast(`You already have a username !`, 'error', 3000);
				navigate('/play');
			}
		}
	}, [loading, isAuthenticated, user?.noUsername, navigate]);

	if (loading) {
        return (
            <div className="flex size-full items-center justify-center">
                <div className="size-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            </div>
        );
    }

    if (!isAuthenticated || !user?.noUsername) {
        return null;
    }

    return <FragmentComponent>{children}</FragmentComponent>;
	// // Always return the same structure to avoid reconciliation issues
	// const showContent = !loading && isAuthenticated && user?.noUsername;
	
	// return (
	// 	<FragmentComponent>
	// 		{loading && (
	// 			<div className="flex size-full items-center justify-center">
	// 				<div className="size-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
	// 			</div>
	// 		)}
	// 		{showContent && children}
	// 	</FragmentComponent>
	// );
}
