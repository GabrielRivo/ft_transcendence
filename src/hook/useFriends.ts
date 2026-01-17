import { useState, useEffect, useCallback } from 'my-react';
import { useAuth } from './useAuth';
import { socialSocket } from '../libs/socket';
import { fetchWithAuth } from '../libs/fetchWithAuth';

const API_BASE = '/api/social/friend-management';

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

export function useFriends() {
	const { isAuthenticated, user } = useAuth();
	const [friends, setFriends] = useState<Friend[]>([]);
	const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchFriends = useCallback(async () => {
		if (!isAuthenticated || !user || user.noUsername) {
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
	}, [isAuthenticated, user?.id, user?.noUsername]);

	const fetchPendingInvitations = useCallback(async () => {
		if (!isAuthenticated || !user || user.noUsername) {
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
	}, [isAuthenticated, user?.id, user?.noUsername]);

	useEffect(() => {
		if (!isAuthenticated || !user) return;

		const handleFriendRequest = (data: { senderId: number; senderUsername: string }) => {
			setPendingInvitations((prev) => {
				// Éviter les doublons
				if (prev.some((inv) => inv.senderId === data.senderId)) {
					return prev;
				}
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

		socialSocket.on('friend_request', handleFriendRequest);
		socialSocket.on('friend_accepted', handleFriendAccepted);

		return () => {
			socialSocket.off('friend_request', handleFriendRequest);
			socialSocket.off('friend_accepted', handleFriendAccepted);
		};
	}, [isAuthenticated, user?.id]);

	useEffect(() => {
		fetchFriends();
		fetchPendingInvitations();
	}, [fetchFriends, fetchPendingInvitations]);

	const sendFriendInviteByUsername = useCallback(
		async (targetUsername: string): Promise<FriendInviteResult> => {
			if (!user) return { success: false, message: 'Not authenticated' };

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
		[user?.id, user?.username],
	);

	const sendFriendInvite = useCallback(
		async (otherId: number): Promise<boolean> => {
			if (!user) return false;

			try {
				const response = await fetchWithAuth(`${API_BASE}/invite`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ userId: user.id, otherId }),
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
		[user?.id],
	);

	const acceptFriendInvite = useCallback(
		async (senderId: number): Promise<boolean> => {
			if (!user) return false;

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
					setPendingInvitations((prev) => prev.filter((inv) => inv.senderId !== senderId));
					await fetchFriends();
				}
				return result.success;
			} catch {
				return false;
			}
		},
		[user?.id, fetchFriends],
	);

	const declineFriendInvite = useCallback(
		async (senderId: number): Promise<boolean> => {
			if (!user) return false;

			try {
				const response = await fetchWithAuth(`${API_BASE}/friend`, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ userId: senderId, otherId: user.id }),
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
		[user?.id],
	);

	const removeFriend = useCallback(
		async (friendId: number): Promise<boolean> => {
			if (!user) return false;

			try {
				const response = await fetchWithAuth(`${API_BASE}/friend`, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ userId: user.id, otherId: friendId }),
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
		[user?.id],
	);

	return {
		friends,
		pendingInvitations,
		loading,
		error,
		refreshFriends: fetchFriends,
		refreshPendingInvitations: fetchPendingInvitations,
		sendFriendInvite,
		sendFriendInviteByUsername,
		acceptFriendInvite,
		declineFriendInvite,
		removeFriend,
	};
}
