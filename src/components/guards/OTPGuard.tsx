import { createElement, useEffect, Element, FragmentComponent } from 'my-react';
import { useNavigate } from 'my-react-router';
import { useAuth } from '@hook/useAuth';
import { useToast } from '@hook/useToast';

interface OTPGuardProps {
	children?: Element;
}

export function OTPGuard({ children }: OTPGuardProps) {
	const { isAuthenticated, user, loading } = useAuth();
	const navigate = useNavigate();
	const { toast } = useToast();

	useEffect(() => {
		if (!loading) {
			if (!isAuthenticated) {
				toast('You must be logged in!', 'error', 3000);
				navigate('/login');
				return;
			}

			// Si 2FA non activee ou deja verifiee, rediriger vers /play
			if (!user?.twoFA || user?.twoFAVerified) {
				toast('2FA verification not required', 'info', 3000);
				navigate('/play');
			}
		}
	}, [loading, isAuthenticated, user?.twoFA, user?.twoFAVerified, navigate]);

	if (loading) {
		return (
			<div className="flex size-full items-center justify-center">
				<div className="size-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
			</div>
		);
	}

	if (!isAuthenticated || !user?.twoFA || user?.twoFAVerified) {
		return null;
	}

	return <FragmentComponent>{children}</FragmentComponent>;
}
