import { useContext } from 'my-react';
import { OnlineUsersContext, OnlineUsersContextType, OnlineUser } from '../context/onlineUsersContext';

export type { OnlineUser };

export function useOnlineUsers(): OnlineUsersContextType {
	const context = useContext(OnlineUsersContext);

	if (!context) {
		throw new Error('useOnlineUsers must be used within an OnlineUsersProvider');
	}

	return context as OnlineUsersContextType;
}
