import { createElement, useState, useEffect, useCallback, useRef, Element } from 'my-react';
import { FriendsContext, Friend, PendingInvitation, FriendInviteResult } from './friendsContext';
import { useAuth } from '../hook/useAuth';
import { useOnlineUsers } from '../hook/useOnlineUsers';
import { userSocket } from '../libs/socket';
import { fetchWithAuth } from '../libs/fetchWithAuth';

const API_BASE = '/api/user/friend-management';

interface FriendsProviderProps {
	children?: Element;
}

export function FriendsProvider({ children }: FriendsProviderProps) {
	const { isAuthenticated, user } = useAuth();
	const { isOnline } = useOnlineUsers();
	const [friends, setFriends] = useState<Friend[]>([]);
	const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const isConnectingRef = useRef(false);

	// Connect socket when authenticated
	useEffect(() => {
		if (isAuthenticated && user && !user.noUsername && !user?.isGuest) {
			isConnectingRef.current = true;

			userSocket.auth = {
				userId: String(user.id),
				username: user.username,
			};

			userSocket.connect();
		}

		return () => {
			if (userSocket.connected) {
				userSocket.disconnect();
			}
			isConnectingRef.current = false;
		};
	}, [isAuthenticated, user]);

	const fetchFriends = useCallback(async () => {
		if (!isAuthenticated || !user || user.noUsername || user?.isGuest) {
			setFriends([]);
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			setError(null);

			const response = await fetchWithAuth(`${API_BASE}/friends/${user.id}`);

			if (!response.ok) {
				throw new Error('Failed to fetch friends');
			}

			const data = await response.json();
			setFriends(Array.isArray(data) ? data : []);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unknown error');
			setFriends([]);
		} finally {
			setLoading(false);
		}
	}, [isAuthenticated, user?.id, user?.noUsername, user?.isGuest]);

	const fetchPendingInvitations = useCallback(async () => {
		if (!isAuthenticated || !user || user.noUsername || user?.isGuest) {
			setPendingInvitations([]);
			return;
		}

		try {
			const response = await fetchWithAuth(`${API_BASE}/pending/${user.id}`);

			if (response.ok) {
				const data = await response.json();
				setPendingInvitations(Array.isArray(data) ? data : []);
			}
		} catch {
			// Silently fail
		}
	}, [isAuthenticated, user?.id, user?.noUsername, user?.isGuest]);

	// Socket event handlers
	useEffect(() => {
		if (!isAuthenticated || !user || user?.isGuest) return;

		const handleFriendRequest = (data: { senderId: number; senderUsername: string }) => {
			console.log('[FriendsProvider] friend_request received:', data);
			setPendingInvitations((prev) => {
				console.log('[FriendsProvider] prev pendingInvitations:', prev);
				if (prev.some((inv) => inv.senderId === data.senderId)) {
					console.log('[FriendsProvider] Already in pending, skipping');
					return prev;
				}
				console.log('[FriendsProvider] Adding new pending invitation');
				return [
					...prev,
					{
						senderId: data.senderId,
						senderUsername: data.senderUsername,
						created_at: new Date().toISOString(),
					},
				];
			});
		};

		const handleFriendAccepted = (data: { friendId: number; friendUsername: string }) => {
			setFriends((prev) => {
				if (prev.some((f) => f.id === data.friendId)) {
					return prev;
				}
				return [...prev, { id: data.friendId, username: data.friendUsername }];
			});
		};

		const handleFriendRemoved = (data: { friendId: number }) => {
			setFriends((prev) => prev.filter((f) => f.id !== data.friendId));
		};

		userSocket.on('friend_request', handleFriendRequest);
		userSocket.on('friend_accepted', handleFriendAccepted);
		userSocket.on('friend_removed', handleFriendRemoved);

		return () => {
			userSocket.off('friend_request', handleFriendRequest);
			userSocket.off('friend_accepted', handleFriendAccepted);
			userSocket.off('friend_removed', handleFriendRemoved);
		};
	}, [isAuthenticated, user?.id, user?.isGuest]);

	// Initial data fetch
	useEffect(() => {
		fetchFriends();
		fetchPendingInvitations();
	}, [fetchFriends, fetchPendingInvitations]);

	const sendFriendInviteByUsername = useCallback(
		async (targetUsername: string): Promise<FriendInviteResult> => {
			if (!user || user?.isGuest) return { success: false, message: 'Not authenticated' };

			try {
				const response = await fetchWithAuth(`${API_BASE}/invite-by-username`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						userId: user.id,
						senderUsername: user.username,
						targetUsername,
					}),
				});

				const result = await response.json();
				return { success: result.success, message: result.message };
			} catch {
				return { success: false, message: 'Network error' };
			}
		},
		[user?.id, user?.username, user?.isGuest],
	);

	const sendFriendInvite = useCallback(
		async (otherId: number): Promise<boolean> => {
			if (!user || user?.isGuest) return false;

			try {
				const response = await fetchWithAuth(`${API_BASE}/invite`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ otherId }),
				});

				if (!response.ok) {
					return false;
				}

				const result = await response.json();
				return result.success;
			} catch {
				return false;
			}
		},
		[user?.id, user?.isGuest],
	);

	const acceptFriendInvite = useCallback(
		async (senderId: number, senderUsername?: string): Promise<boolean> => {
			if (!user || user?.isGuest) return false;

			const username = senderUsername || pendingInvitations.find((inv) => inv.senderId === senderId)?.senderUsername || '';

			try {
				const response = await fetchWithAuth(`${API_BASE}/accept`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ userId: user.id, otherId: senderId }),
				});

				if (!response.ok) {
					return false;
				}

				const result = await response.json();
				if (result.success) {
					setFriends((prev) => {
						if (prev.some((f) => f.id === senderId)) {
							return prev;
						}
						return [...prev, { id: senderId, username }];
					});
					setPendingInvitations((prev) => prev.filter((inv) => inv.senderId !== senderId));
				}
				return result.success;
			} catch {
				return false;
			}
		},
		[user?.id, pendingInvitations, user?.isGuest],
	);

	const declineFriendInvite = useCallback(
		async (senderId: number): Promise<boolean> => {
			if (!user || user?.isGuest) return false;

			try {
				const response = await fetchWithAuth(`${API_BASE}/friend`, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ otherId: senderId }),
				});

				if (!response.ok) {
					return false;
				}

				const result = await response.json();
				if (result.success) {
					setPendingInvitations((prev) => prev.filter((inv) => inv.senderId !== senderId));
				}
				return result.success;
			} catch {
				return false;
			}
		},
		[user?.id, user?.isGuest],
	);

	const removeFriend = useCallback(
		async (friendId: number): Promise<boolean> => {
			if (!user || user?.isGuest) return false;

			try {
				const response = await fetchWithAuth(`${API_BASE}/friend`, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ otherId: friendId }),
				});

				if (!response.ok) {
					return false;
				}

				const result = await response.json();
				if (result.success) {
					setFriends((prev) => prev.filter((f) => f.id !== friendId));
				}
				return result.success;
			} catch {
				return false;
			}
		},
		[user?.id, user?.isGuest],
	);

	return (
		<FriendsContext.Provider
			value={{
				friends,
				pendingInvitations,
				loading,
				error,
				isOnline,
				refreshFriends: fetchFriends,
				refreshPendingInvitations: fetchPendingInvitations,
				sendFriendInvite,
				sendFriendInviteByUsername,
				acceptFriendInvite,
				declineFriendInvite,
				removeFriend,
			}}
		>
			{children}
		</FriendsContext.Provider>
	);
}

