import { createElement, useMemo, useState, useEffect, useCallback, useRef, Element } from 'my-react';
import { AuthContext, User } from './authContext';
import { useNavigate } from 'my-react-router';

const API_BASE = '/api/auth';
const REFRESH_INTERVAL = 4 * 60 * 1000; // Refresh every 4 minutes (token expires in 5min)

interface AuthProviderProps {
	children?: Element;
}

export function AuthProvider({ children }: AuthProviderProps) {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const refreshTimerRef = useRef<number | null>(null);
	const isRefreshingRef = useRef(false);

	// Refresh the access token
	const refreshToken = useCallback(async (): Promise<boolean> => {
		if (isRefreshingRef.current) return false;
		isRefreshingRef.current = true;

		try {
			const response = await fetch(`${API_BASE}/refresh`, {
				method: 'POST',
				credentials: 'include',
			});

			if (!response.ok) {
				setIsAuthenticated(false);
				setUser(null);
				return false;
			}

			return true;
		} catch {
			setIsAuthenticated(false);
			setUser(null);
			return false;
		} finally {
			isRefreshingRef.current = false;
		}
	}, []);

	// Start the auto-refresh timer
	const startRefreshTimer = useCallback(() => {
		if (refreshTimerRef.current) {
			clearInterval(refreshTimerRef.current);
		}

		refreshTimerRef.current = window.setInterval(async () => {
			if (isAuthenticated) {
				await refreshToken();
			}
		}, REFRESH_INTERVAL);
	}, [isAuthenticated, refreshToken]);

	// Stop the auto-refresh timer
	const stopRefreshTimer = useCallback(() => {
		if (refreshTimerRef.current) {
			clearInterval(refreshTimerRef.current);
			refreshTimerRef.current = null;
		}
	}, []);

	const checkAuth = useCallback(async () => {
		try {
			const response = await fetch(`${API_BASE}/me`, {
				credentials: 'include',
			});

			if (!response.ok) {
				// Try to refresh token if 401
				if (response.status === 401) {
					const refreshed = await refreshToken();
					if (refreshed) {
						// Retry checkAuth after refresh
						const retryResponse = await fetch(`${API_BASE}/me`, {
							credentials: 'include',
						});
						if (retryResponse.ok) {
							const data = await retryResponse.json();
							if (data.authenticated && data.user) {
								setIsAuthenticated(true);
							setUser({
								id: data.user.id,
								email: data.user.email,
								username: data.user.username || '',
								noUsername: data.user.noUsername || false,
								suggestedUsername: data.user.suggestedUsername || undefined,
								twoFA: data.user.twoFA || false,
								twoFAVerified: data.user.twoFAVerified || false,
								isGuest: data.user.isGuest || false,
							});
							return;
							}
						}
					}
				}
				setIsAuthenticated(false);
				setUser(null);
				return;
			}

			const data = await response.json();

		if (data.authenticated && data.user) {
			setIsAuthenticated(true);
			setUser({
				id: data.user.id,
				email: data.user.email,
				username: data.user.username || '',
				noUsername: data.user.noUsername || false,
				suggestedUsername: data.user.suggestedUsername || undefined,
				twoFA: data.user.twoFA || false,
				twoFAVerified: data.user.twoFAVerified || false,
				isGuest: data.user.isGuest || false,
			});
		} else {
			setIsAuthenticated(false);
			setUser(null);
		}
		} catch {
			setIsAuthenticated(false);
			setUser(null);
		} finally {
			setLoading(false);
		}
	}, [refreshToken]);

	const login = useCallback(async (email: string, password: string): Promise<boolean> => {
		try {
			const response = await fetch(`${API_BASE}/login`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({ email, password }),
			});

			if (!response.ok) {
				return false;
			}

			await checkAuth();
			return true;
		} catch {
			return false;
		}
	}, [checkAuth]);

	const register = useCallback(async (email: string, password: string): Promise<boolean> => {
		try {
			const response = await fetch(`${API_BASE}/register`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({ email, password }),
			});

			if (!response.ok) {
				return false;
			}

			await checkAuth();
			return true;
		} catch {
			return false;
		}
	}, [checkAuth]);

	const loginAsGuest = useCallback(async (username: string): Promise<boolean> => {
		try {
			const response = await fetch(`${API_BASE}/guest`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({ username }),
			});

			if (!response.ok) {
				return false;
			}

			await checkAuth();
			return true;
		} catch {
			return false;
		}
	}, [checkAuth]);

	const setUsername = useCallback(async (username: string): Promise<boolean> => {
		try {
			const response = await fetch(`${API_BASE}/username`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({ username }),
			});

			if (!response.ok) {
				return false;
			}

			await checkAuth();
			return true;
		} catch {
			return false;
		}
	}, [checkAuth]);

	const verify2FA = useCallback(async (code: string): Promise<boolean> => {
		try {
			const response = await fetch(`${API_BASE}/2fa/verify`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify({ code }),
			});

			if (!response.ok) {
				return false;
			}

			await checkAuth();
			return true;
		} catch {
			return false;
		}
	}, [checkAuth]);

	const logout = useCallback(async () => {
		stopRefreshTimer();
		try {
			await fetch(`${API_BASE}/logout`, {
				method: 'POST',
				credentials: 'include',
			});
		} catch {
			// ignore errors
		} finally {
			setIsAuthenticated(false);
			setUser(null);
		}
	}, [stopRefreshTimer]);

	// Start/stop refresh timer based on authentication state
	useEffect(() => {
		if (isAuthenticated) {
			startRefreshTimer();
		} else {
			stopRefreshTimer();
		}

		return () => {
			stopRefreshTimer();
		};
	}, [isAuthenticated, startRefreshTimer, stopRefreshTimer]);

	// Initial auth check
	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

	const value = useMemo(
		() => ({
			isAuthenticated,
			user,
			loading,
			login,
			register,
			loginAsGuest,
			logout,
			checkAuth,
			setUsername,
			verify2FA,
		}),
		[isAuthenticated, user, loading, login, register, loginAsGuest, logout, checkAuth, setUsername, verify2FA]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
