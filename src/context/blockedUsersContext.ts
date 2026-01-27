import { createContext } from 'my-react';

export interface BlockedUsersContextType {
	blockedUsers: Set<number>;
	isBlocked: (userId: number) => boolean;
	blockUser: (userId: number) => Promise<boolean>;
	unblockUser: (userId: number) => Promise<boolean>;
	loading: boolean;
}

export const BlockedUsersContext = createContext<BlockedUsersContextType | null>(null);
