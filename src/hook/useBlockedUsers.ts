import { useContext } from 'my-react';
import { BlockedUsersContext, BlockedUsersContextType } from '../context/blockedUsersContext';

export function useBlockedUsers(): BlockedUsersContextType {
	const context = useContext(BlockedUsersContext);

	if (!context) {
		throw new Error('useBlockedUsers must be used within a BlockedUsersProvider');
	}

	return context as BlockedUsersContextType;
}
