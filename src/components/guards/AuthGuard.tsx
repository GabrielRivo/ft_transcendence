import { createElement, useEffect, useState, useRef, Element, FragmentComponent } from 'my-react';
import { useNavigate } from 'my-react-router';
import { useAuth } from '@hook/useAuth';
import { useToast } from '@hook/useToast';
import { fetchJsonWithAuth } from '@libs/fetchWithAuth';

interface AuthGuardProps {
	children?: Element;
	key?: string;
}

export function AuthGuard({ children }: AuthGuardProps) {
	const { isAuthenticated, user, loading } = useAuth();
	const navigate = useNavigate();
	const { toast } = useToast();

	const isPathMatch = (path: string, allowedPaths: string[]) => {
		return allowedPaths.some(p => path === p || path.startsWith(p + '/'));
	};

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
			return;
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
