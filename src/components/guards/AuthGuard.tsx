import { createElement, useEffect, useState, useRef, Element, FragmentComponent } from 'my-react';
import { useNavigate, useLocation } from 'my-react-router';
import { useAuth } from '@hook/useAuth';
import { useToast } from '@hook/useToast';
import { fetchJsonWithAuth } from '@libs/fetchWithAuth';

interface AuthGuardProps {
	children?: Element;
	key?: string;
}

interface ActiveTournamentResponse {
	id: string;
	visibility: string;
	size: number;
}

export function AuthGuard({ children }: AuthGuardProps) {
	const { isAuthenticated, user, loading } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const { toast } = useToast();

	const isPathMatch = (path: string, allowedPaths: string[]) => {
		return allowedPaths.some(p => path === p || path.startsWith(p + '/'));
	};

	const shouldSkipSpinner = (path: string) => {
		// These paths should not show the initial "Checking Tournament..." spinner.
		const NO_SPINNER_PATHS = ['/profile', '/statistics', '/dashboard', '/logout', '/settings', '/play'];
		return path.includes('/play/tournament') || isPathMatch(path, NO_SPINNER_PATHS);
	};

	const shouldSkipCheck = (path: string) => {
		// These paths should completely IGNORE tournament checks (no redirect).
		// Note: /play is NOT here because we WANT to check on /play (auto-redirect), just not block.
		const NO_CHECK_PATHS = ['/profile', '/statistics', '/dashboard', '/logout', '/settings'];
		return path.includes('/play/tournament') || isPathMatch(path, NO_CHECK_PATHS);
	};

	// Functional updates in useState require the type to match.
	// If custom React types are strict or missing definitions, simple value works if safe.
	// But to avoid "Argument of type '() => boolean' is not assignable to parameter of type 'boolean'"
	// it implies useState signature expects boolean directly? 
	// Let's check imports. It imports `useState` from `my-react`. 
	// If `my-react` useState only accepts `S`, not `() => S`.
	const [isCheckingTournament, setIsCheckingTournament] = useState<boolean>(!shouldSkipSpinner(location.pathname));
	// Track the last checked path to prevent duplicate checks on the same route (Strict Mode)
	// but allow checks when the route changes.
	const lastCheckedPath = useRef<string | null>(null);

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

		// Check for active tournament
		const checkActiveTournament = async () => {
			if (lastCheckedPath.current === currentPath) return;
			lastCheckedPath.current = currentPath;

			const skipSpinner = shouldSkipSpinner(currentPath);
			const skipCheck = shouldSkipCheck(currentPath);

			// If we should skip the check entirely (e.g. Profile), ensure spinner is off and return.
			if (skipCheck) {
				setIsCheckingTournament(false);
				return;
			}

			// If not matching skipSpinner (e.g. protected page), we must ensure blocking.
			if (!skipSpinner) {
				setIsCheckingTournament(true);
			} else {
				// If whitelisted, ensure we are NOT blocking.
				setIsCheckingTournament(false);
			}

			// Perform the check regardless of whether we block or not
			// because we want auto-redirect even on /play.
			try {
				const result = await fetchJsonWithAuth<ActiveTournamentResponse>('/api/tournament/active');
				if (result.ok && result.data && result.data.id) {
					console.log('[AuthGuard] Redirecting to active tournament:', result.data.id);
					const { visibility, size } = result.data;
					const type = visibility.toLowerCase();
					const targetUrl = `/play/tournament/${type}/${size}`;

					// If we are already on the target URL (or sub-route), don't redirect loop
					if (currentPath.startsWith(`/play/tournament/${type}/${size}`)) {
						setIsCheckingTournament(false);
						return;
					}

					toast('You have an active tournament! Redirecting...', 'info', 3000);
					navigate(targetUrl, { state: { activeTournamentId: result.data.id } });
				} else {
					// No active tournament, allow render
					setIsCheckingTournament(false);
				}
			} catch (err) {
				console.error('[AuthGuard] Failed to check active tournament:', err);
				setIsCheckingTournament(false);
			}
		};

		if (!user?.noUsername) {
			checkActiveTournament();
		} else {
			setIsCheckingTournament(false);
		}

	}, [loading, isAuthenticated, user?.noUsername, navigate, location.pathname]);

	if (loading || !isAuthenticated || isCheckingTournament) {
		return (
			<div className="flex size-full items-center justify-center">
				<div className="size-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
			</div>
		);
	}

	return <FragmentComponent>{children}</FragmentComponent>;
}
