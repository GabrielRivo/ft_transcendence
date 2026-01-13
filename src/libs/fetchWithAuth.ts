/**
 * Fetch wrapper with automatic token refresh on 401
 */

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
	try {
		const response = await fetch('/api/auth/refresh', {
			method: 'POST',
			credentials: 'include',
		});
		return response.ok;
	} catch {
		return false;
	}
}

export async function fetchWithAuth(
	url: string,
	options: RequestInit = {}
): Promise<Response> {
	// Ensure credentials are included
	const fetchOptions: RequestInit = {
		...options,
		credentials: 'include',
	};

	// First attempt
	let response = await fetch(url, fetchOptions);

	// If 401, try to refresh token
	if (response.status === 401) {
		// Prevent multiple refresh calls
		if (!isRefreshing) {
			isRefreshing = true;
			refreshPromise = refreshToken();
		}

		const refreshed = await refreshPromise;
		isRefreshing = false;
		refreshPromise = null;

		if (refreshed) {
			// Retry the original request
			response = await fetch(url, fetchOptions);
		}
	}

	return response;
}

/**
 * Helper for JSON requests with auto-refresh
 */
export async function fetchJsonWithAuth<T>(
	url: string,
	options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
	try {
		const response = await fetchWithAuth(url, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...options.headers,
			},
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			return {
				ok: false,
				status: response.status,
				error: errorData.message || errorData.error || `HTTP ${response.status}`,
			};
		}

		const data = await response.json();
		return { ok: true, status: response.status, data };
	} catch (error) {
		return {
			ok: false,
			status: 0,
			error: error instanceof Error ? error.message : 'Network error',
		};
	}
}

