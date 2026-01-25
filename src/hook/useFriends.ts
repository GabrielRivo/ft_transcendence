import { useContext } from 'my-react';
import { FriendsContext, FriendsContextType, Friend, PendingInvitation, FriendInviteResult } from '../context/friendsContext';

export type { Friend, PendingInvitation, FriendInviteResult };

export function useFriends(): FriendsContextType {
	const context = useContext(FriendsContext);

	if (!context) {
		throw new Error('useFriends must be used within a FriendsProvider');
	}

	return context as FriendsContextType;
}
