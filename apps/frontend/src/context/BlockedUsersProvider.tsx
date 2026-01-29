import { createElement, useState, useEffect, useCallback, Element } from 'my-react';
import { BlockedUsersContext } from './blockedUsersContext';
import { useAuth } from '../hook/useAuth';
import { userSocket } from '../libs/socket';
import { fetchWithAuth } from '../libs/fetchWithAuth';

const API_BASE = '/api/user/friend-management';

interface BlockedUsersProviderProps {
	children?: Element;
}

export function BlockedUsersProvider({ children }: BlockedUsersProviderProps) {
	const { isAuthenticated, user } = useAuth();
	const [blockedUsers, setBlockedUsers] = useState<Set<number>>(new Set());
	const [loading, setLoading] = useState(true);

	// Fetch initial blocked users list
	const fetchBlockedUsers = useCallback(async () => {
		if (!isAuthenticated || !user || user.noUsername || user?.isGuest) {
			setBlockedUsers(new Set());
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			const response = await fetchWithAuth(`${API_BASE}/blocked-list`);

			if (response.ok) {
				const data = await response.json();
				setBlockedUsers(new Set(data.blockedIds || []));
			}
		} catch {
			// Silently fail
		} finally {
			setLoading(false);
		}
	}, [isAuthenticated, user?.id, user?.noUsername]);

	// Socket event handlers
	useEffect(() => {
		if (!isAuthenticated || !user || user?.isGuest) return;

		const handleUserBlocked = (data: { blockedUserId: number }) => {
			setBlockedUsers((prev) => {
				const next = new Set(prev);
				next.add(data.blockedUserId);
				return next;
			});
		};

		const handleUserUnblocked = (data: { unblockedUserId: number }) => {
			setBlockedUsers((prev) => {
				const next = new Set(prev);
				next.delete(data.unblockedUserId);
				return next;
			});
		};

		userSocket.on('user_blocked', handleUserBlocked);
		userSocket.on('user_unblocked', handleUserUnblocked);

		return () => {
			userSocket.off('user_blocked', handleUserBlocked);
			userSocket.off('user_unblocked', handleUserUnblocked);
		};
	}, [isAuthenticated, user?.id, user?.isGuest]);

	// Initial data fetch
	useEffect(() => {
		fetchBlockedUsers();
	}, [fetchBlockedUsers]);

	const isBlocked = useCallback(
		(userId: number): boolean => {
			return blockedUsers.has(userId);
		},
		[blockedUsers],
	);

	const blockUser = useCallback(
		async (otherId: number): Promise<boolean> => {
			if (!user || user?.isGuest) return false;

			try {
				const response = await fetchWithAuth(`${API_BASE}/block`, {
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
				if (result.success) {
					setBlockedUsers((prev) => {
						const next = new Set(prev);
						next.add(otherId);
						return next;
					});
				}
				return result.success;
			} catch {
				return false;
			}
		},
		[user?.id, user?.isGuest],
	);

	const unblockUser = useCallback(
		async (otherId: number): Promise<boolean> => {
			if (!user || user?.isGuest) return false;

			try {
				const response = await fetchWithAuth(`${API_BASE}/block`, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ otherId }),
				});

				if (!response.ok) {
					return false;
				}

				const result = await response.json();
				if (result.success) {
					setBlockedUsers((prev) => {
						const next = new Set(prev);
						next.delete(otherId);
						return next;
					});
				}
				return result.success;
			} catch {
				return false;
			}
		},
		[user?.id, user?.isGuest],
	);

	return (
		<BlockedUsersContext.Provider
			value={{
				blockedUsers,
				isBlocked,
				blockUser,
				unblockUser,
				loading,
			}}
		>
			{children}
		</BlockedUsersContext.Provider>
	);
}
