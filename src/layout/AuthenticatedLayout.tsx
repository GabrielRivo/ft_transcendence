import { createElement, Element, FragmentComponent } from 'my-react';
import { useLocation } from 'my-react-router';
import { AuthGuard } from '../components/guards';
import { FriendRequestToastContainer } from '../components/ui/FriendRequestToast';

interface AuthenticatedLayoutProps {
	children?: Element;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
	const location = useLocation();

	return (
		<AuthGuard>
			<FragmentComponent>
				{children}
				<FriendRequestToastContainer />
			</FragmentComponent>
		</AuthGuard>
	);
}
