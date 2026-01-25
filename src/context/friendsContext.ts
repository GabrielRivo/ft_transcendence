import { createContext } from 'my-react';

export interface Friend {
	id: number;
	username: string;
}

export interface PendingInvitation {
	senderId: number;
	senderUsername: string;
	created_at: string;
}

export interface FriendInviteResult {
	success: boolean;
	message?: string;
}

export interface FriendsContextType {
	friends: Friend[];
	pendingInvitations: PendingInvitation[];
	loading: boolean;
	error: string | null;
	refreshFriends: () => Promise<void>;
	refreshPendingInvitations: () => Promise<void>;
	sendFriendInvite: (otherId: number) => Promise<boolean>;
	sendFriendInviteByUsername: (targetUsername: string) => Promise<FriendInviteResult>;
	acceptFriendInvite: (senderId: number, senderUsername?: string) => Promise<boolean>;
	declineFriendInvite: (senderId: number) => Promise<boolean>;
	removeFriend: (friendId: number) => Promise<boolean>;
}

export const FriendsContext = createContext<FriendsContextType | null>(null);

