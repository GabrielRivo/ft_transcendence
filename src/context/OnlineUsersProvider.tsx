import { createElement, useState, useEffect, useCallback, useRef, Element } from 'my-react';
import { OnlineUsersContext, OnlineUser } from './onlineUsersContext';
import { useAuth } from '../hook/useAuth';
import { userSocket } from '../libs/socket';
import { fetchWithAuth } from '../libs/fetchWithAuth';

const API_BASE = '/api/user';

interface OnlineUsersProviderProps {
	children?: Element;
}

export function OnlineUsersProvider({ children }: OnlineUsersProviderProps) {
	const { isAuthenticated, user } = useAuth();
	const [onlineUsers, setOnlineUsers] = useState<Map<number, OnlineUser>>(new Map());
	const [offlineUsersCache, setOfflineUsersCache] = useState<Map<number, OnlineUser>>(new Map());
	const [loading, setLoading] = useState(true);
	const fetchingRef = useRef<Set<number>>(new Set());

	// Fetch initial online users
	const fetchOnlineUsers = useCallback(async () => {
		if (!isAuthenticated || !user || user.noUsername || user?.isGuest) {
			setOnlineUsers(new Map());
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			const response = await fetchWithAuth(`${API_BASE}/online`);

			if (response.ok) {
				const data = await response.json();
				const usersMap = new Map<number, OnlineUser>();
				
				if (Array.isArray(data.users)) {
					for (const u of data.users) {
						usersMap.set(u.userId, {
							userId: u.userId,
							username: u.username,
							avatar: u.avatar
						});
					}
				}
				
				setOnlineUsers(usersMap);
			}
		} catch (err) {
			console.error('[OnlineUsersProvider] Failed to fetch online users:', err);
		} finally {
			setLoading(false);
		}
	}, [isAuthenticated, user?.id, user?.noUsername, user?.isGuest]);

	// Socket event handlers
	useEffect(() => {
		if (!isAuthenticated || !user || user.noUsername || user?.isGuest) return;

		const handleUserOnline = (data: { userId: number; username: string; avatar: string | null }) => {
			setOnlineUsers((prev) => {
				const newMap = new Map(prev);
				newMap.set(data.userId, {
					userId: data.userId,
					username: data.username,
					avatar: data.avatar
				});
				return newMap;
			});
		};

		const handleUserOffline = (data: { userId: number }) => {
			setOnlineUsers((prev) => {
				const userToCache = prev.get(data.userId);
				// Déplacer l'utilisateur vers le cache offline
				if (userToCache) {
					setOfflineUsersCache((cache) => {
						const newCache = new Map(cache);
						newCache.set(data.userId, userToCache);
						return newCache;
					});
				}
				const newMap = new Map(prev);
				newMap.delete(data.userId);
				return newMap;
			});
		};

		const handleAvatarUpdated = (data: { userId: number; avatarUrl: string | null }) => {
			setOnlineUsers((prev) => {
				const user = prev.get(data.userId);
				if (!user) return prev;
				
				const newMap = new Map(prev);
				newMap.set(data.userId, {
					...user,
					avatar: data.avatarUrl
				});
				return newMap;
			});
		};

		const handleUsernameUpdated = (data: { userId: number; username: string }) => {
			setOnlineUsers((prev) => {
				const user = prev.get(data.userId);
				if (!user) return prev;
				
				const newMap = new Map(prev);
				newMap.set(data.userId, {
					...user,
					username: data.username
				});
				return newMap;
			});
		};

		// Listen to socket events
		userSocket.on('user_online', handleUserOnline);
		userSocket.on('user_offline', handleUserOffline);
		userSocket.on('avatar_uploaded', handleAvatarUpdated);
		userSocket.on('avatar_deleted', handleAvatarUpdated);
		userSocket.on('username_updated', handleUsernameUpdated);

		return () => {
			userSocket.off('user_online', handleUserOnline);
			userSocket.off('user_offline', handleUserOffline);
			userSocket.off('avatar_uploaded', handleAvatarUpdated);
			userSocket.off('avatar_deleted', handleAvatarUpdated);
			userSocket.off('username_updated', handleUsernameUpdated);
		};
	}, [isAuthenticated, user?.id, user?.noUsername, user?.isGuest]);

	// Initial fetch when authenticated
	useEffect(() => {
		fetchOnlineUsers();
	}, [fetchOnlineUsers]);

	// Utility functions
	const isOnline = useCallback((userId: number): boolean => {
		return onlineUsers.has(userId);
	}, [onlineUsers]);

	const getUser = useCallback((userId: number): OnlineUser | undefined => {
		// Chercher d'abord dans les utilisateurs online, puis dans le cache offline
		return onlineUsers.get(userId) || offlineUsersCache.get(userId);
	}, [onlineUsers, offlineUsersCache]);

	// Fetch les profils des utilisateurs manquants (ni online, ni dans le cache offline)
	const fetchMissingUsers = useCallback(async (userIds: number[]): Promise<void> => {
		if (!isAuthenticated || userIds.length === 0 || user?.isGuest) return;

		// Filtrer les ids qui ne sont pas déjà dans online, offline, ou en cours de fetch
		const missingIds = userIds.filter(id => 
			!onlineUsers.has(id) && 
			!offlineUsersCache.has(id) && 
			!fetchingRef.current.has(id)
		);

		if (missingIds.length === 0) return;

		// Marquer comme en cours de fetch pour éviter les requêtes dupliquées
		missingIds.forEach(id => fetchingRef.current.add(id));

		try {
			const idsParam = missingIds.join(',');
			const response = await fetchWithAuth(`${API_BASE}/profiles?ids=${idsParam}`);

			if (response.ok) {
				const data = await response.json();
				if (Array.isArray(data.users)) {
					setOfflineUsersCache((cache) => {
						const newCache = new Map(cache);
						for (const u of data.users) {
							newCache.set(u.userId, {
								userId: u.userId,
								username: u.username,
								avatar: u.avatar
							});
						}
						return newCache;
					});
				}
			}
		} catch (err) {
			console.error('[OnlineUsersProvider] Failed to fetch missing users:', err);
		} finally {
			// Retirer de la liste des fetches en cours
			missingIds.forEach(id => fetchingRef.current.delete(id));
		}
	}, [isAuthenticated, onlineUsers, offlineUsersCache, user?.id, user?.isGuest]);

	return (
		<OnlineUsersContext.Provider
			value={{
				onlineUsers,
				offlineUsersCache,
				isOnline,
				getUser,
				fetchMissingUsers,
				loading
			}}
		>
			{children}
		</OnlineUsersContext.Provider>
	);
}
