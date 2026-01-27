import { createContext } from 'my-react';

export interface OnlineUser {
	userId: number;
	username: string;
	avatar: string | null;
}

export interface OnlineUsersContextType {
	onlineUsers: Map<number, OnlineUser>;
	offlineUsersCache: Map<number, OnlineUser>;
	isOnline: (userId: number) => boolean;
	getUser: (userId: number) => OnlineUser | undefined;
	fetchMissingUsers: (userIds: number[]) => Promise<void>;
	loading: boolean;
}

export const OnlineUsersContext = createContext<OnlineUsersContextType | null>(null);
