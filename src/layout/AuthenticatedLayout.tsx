import { createElement, Element, FragmentComponent, useEffect } from 'my-react';
import { useNavigate, useRouter } from 'my-react-router';
import { useAuth } from '@/hook/useAuth';

function useActiveGameRedirect() {
	const router = useRouter();
	const navigate = useNavigate();
	const { user } = useAuth();

	useEffect(() => {
		if (!user) return;

		// Don't check/redirect if already on the game page
		if (router.path === '/game') {
			return;
		}

		// console.log('[AuthenticatedLayout] Checking for active game...');
		fetch('/api/game/games/active', {
			method: 'GET',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
			},
		})
			.then(async (res) => {
				if (res.ok) {
					return res.json();
				}
				return null;
			})
			.then((data) => {
				if (data && data.gameId) {
				// 	console.log(`[AuthenticatedLayout] Active game found: ${data.gameId}. Redirecting...`);
					const targetPath = `/game?id=${data.gameId}`;

					// Avoid redundant navigation
					const currentUrl = new URL(window.location.href);
					if (currentUrl.pathname !== '/game' || currentUrl.searchParams.get('id') !== data.gameId) {
						navigate(targetPath);
					}
				}
			})
			.catch((err) => {
				console.error('[AuthenticatedLayout] Failed to check active game', err);
			});
	}, [router.path, user, navigate]);
}
import { AuthGuard } from '../components/guards';
import { FriendRequestToastContainer } from '../components/ui/FriendRequestToast';

interface AuthenticatedLayoutProps {
	children?: Element;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
	useActiveGameRedirect();
	return (
		<AuthGuard>
			<FragmentComponent>
				{children}
				<FriendRequestToastContainer />
			</FragmentComponent>
		</AuthGuard>
	);
}
