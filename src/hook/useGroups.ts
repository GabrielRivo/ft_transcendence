import { useState, useEffect, useCallback } from 'my-react';
import { useAuth } from './useAuth';
import { fetchWithAuth } from '../libs/fetchWithAuth';
import { chatSocket } from '../libs/socket';

const API_BASE = '/api/chat/group';

export interface Group {
	groupId: number;
	name: string;
	ownerId: number;
	created_at: string;
}

export interface GroupResult {
	success: boolean;
	message?: string;
	groupId?: number;
}

export function useGroups() {
	const { isAuthenticated, user } = useAuth();
	const [groups, setGroups] = useState<Group[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Récupérer la liste des groupes
	const fetchGroups = useCallback(async () => {
		if (!isAuthenticated || !user || user.noUsername || user?.isGuest) {
			setGroups([]);
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			setError(null);

			const response = await fetchWithAuth(`${API_BASE}/my-groups`);

			if (!response.ok) {
				throw new Error('Failed to fetch groups');
			}

			const data = await response.json();
			setGroups(Array.isArray(data) ? data : []);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unknown error');
			setGroups([]);
		} finally {
			setLoading(false);
		}
	}, [isAuthenticated, user?.id, user?.noUsername, user?.isGuest]);

	// Charger les données initiales
	useEffect(() => {
		fetchGroups();
	}, [fetchGroups]);

	// Écouter les mises à jour en temps réel
	useEffect(() => {
		const handleGroupUpdate = () => {
			fetchGroups();
		};

		chatSocket.on('group_list_update', handleGroupUpdate);

		return () => {
			chatSocket.off('group_list_update', handleGroupUpdate);
		};
	}, [fetchGroups]);

	// Créer un groupe
	const createGroup = useCallback(async (name: string): Promise<GroupResult> => {
		if (!user || user?.isGuest) return { success: false, message: 'Not authenticated' };

		try {
			const response = await fetchWithAuth(`${API_BASE}/create`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					ownerId: user.id,
					name,
				}),
			});

			const result = await response.json();

			if (result.success) {
				// Rafraîchir la liste des groupes
				await fetchGroups();
			}

			return { success: result.success, message: result.message, groupId: result.groupId };
		} catch {
			return { success: false, message: 'Network error' };
		}
	}, [user?.id, fetchGroups, user?.isGuest]);

	// Obtenir les détails d'un groupe
	const getGroup = useCallback(async (groupId: number): Promise<Group | null> => {
		try {
			const response = await fetchWithAuth(`${API_BASE}/group/${groupId}`);

			if (!response.ok) {
				return null;
			}

			return await response.json();
		} catch {
			return null;
		}
	}, []);

	// Ajouter un membre au groupe
	const addMember = useCallback(async (groupId: number, userId: number): Promise<GroupResult> => {
		if (!user || user?.isGuest) return { success: false, message: 'Not authenticated' };

		try {
			const response = await fetchWithAuth(`${API_BASE}/add-member`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					groupId,
					userId,
					inviterId: user.id,
				}),
			});

			const result = await response.json();
			return { success: result.success, message: result.message };
		} catch {
			return { success: false, message: 'Network error' };
		}
	}, [user?.id, user?.isGuest]);

	// Quitter un groupe
	const leaveGroup = useCallback(async (groupId: number): Promise<GroupResult> => {
		if (!user || user?.isGuest) return { success: false, message: 'Not authenticated' };

		try {
			const response = await fetchWithAuth(`${API_BASE}/remove-member`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					groupId,
					userId: user.id,
					removerId: user.id,
				}),
			});

			const result = await response.json();

			if (result.success) {
				setGroups((prev) => prev.filter((g) => g.groupId !== groupId));
			}

			return { success: result.success, message: result.message };
		} catch {
			return { success: false, message: 'Network error' };
		}
	}, [user?.id, user?.isGuest]);

	// Supprimer un groupe (owner seulement)
	const deleteGroup = useCallback(async (groupId: number): Promise<GroupResult> => {
		if (!user || user?.isGuest) return { success: false, message: 'Not authenticated' };

		try {
			const response = await fetchWithAuth(`${API_BASE}/group`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					groupId,
					ownerId: user.id,
				}),
			});

			const result = await response.json();

			if (result.success) {
				setGroups((prev) => prev.filter((g) => g.groupId !== groupId));
			}

			return { success: result.success, message: result.message };
		} catch {
			return { success: false, message: 'Network error' };
		}
	}, [user?.id, user?.isGuest]);

	return {
		groups,
		loading,
		error,
		refreshGroups: fetchGroups,
		createGroup,
		getGroup,
		addMember,
		leaveGroup,
		deleteGroup,
	};
}

