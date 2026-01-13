import { createElement, Element, FragmentComponent } from 'my-react';
import { AuthGuard } from '../components/guards';
import { FriendRequestToastContainer } from '../components/ui/FriendRequestToast';

interface AuthenticatedLayoutProps {
	children?: Element;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
	return (
		<AuthGuard>
			<FragmentComponent>
				{children}
				<FriendRequestToastContainer />
			</FragmentComponent>
		</AuthGuard>
	);
}
