import { io, Socket } from 'socket.io-client';

const SOCKET_BASE_URL: string = window.location.origin;

const DEFAULT_SOCKET_OPTIONS = {
	transports: ['websocket'] as string[],
	autoConnect: false,
	reconnection: true,
	reconnectionAttempts: 5,
	reconnectionDelay: 1000,
	reconnectionDelayMax: 5000,
	timeout: 20000,
	withCredentials: true,
};

export const gameSocket: Socket = io(SOCKET_BASE_URL, {
	...DEFAULT_SOCKET_OPTIONS,
	path: '/api/game/ws/',
});

export const chatSocket: Socket = io(SOCKET_BASE_URL, {
	...DEFAULT_SOCKET_OPTIONS,
	path: '/api/chat/',
});

export const matchmakingSocket: Socket = io(SOCKET_BASE_URL, {
	...DEFAULT_SOCKET_OPTIONS,
	path: '/api/matchmaking/',
});

// deprecated voir pour enlever plus tard
export const socket: Socket = gameSocket;

export function connectAllSockets(): void {
	gameSocket.connect();
	chatSocket.connect();
	matchmakingSocket.connect();
}

export function disconnectAllSockets(): void {
	gameSocket.disconnect();
	chatSocket.disconnect();
	matchmakingSocket.disconnect();
}

export function updateSocketAuth(userId: string, token?: string): void {
	const auth = { userId, token };

	gameSocket.auth = auth;
	chatSocket.auth = auth;
	matchmakingSocket.auth = auth;
}
