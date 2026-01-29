// =============================================================================
// Vitest Setup File
// =============================================================================
//
// This file configures the test environment before any tests run.
// It polyfills browser APIs that don't exist in Node.js.
//
// =============================================================================

import { vi } from 'vitest';

// -----------------------------------------------------------------------------
// Browser API Polyfills
// -----------------------------------------------------------------------------

/**
 * Polyfill for requestIdleCallback.
 *
 * This API is used by my-react's fiber work loop to schedule low-priority work.
 * In the test environment, we simply execute callbacks immediately using setTimeout.
 */
if (typeof globalThis.requestIdleCallback === 'undefined') {
	globalThis.requestIdleCallback = ((callback: IdleRequestCallback): number => {
		const start = Date.now();
		return setTimeout(() => {
			callback({
				didTimeout: false,
				timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
			});
		}, 1) as unknown as number;
	}) as typeof requestIdleCallback;
}

/**
 * Polyfill for cancelIdleCallback.
 */
if (typeof globalThis.cancelIdleCallback === 'undefined') {
	globalThis.cancelIdleCallback = ((id: number): void => {
		clearTimeout(id);
	}) as typeof cancelIdleCallback;
}

// -----------------------------------------------------------------------------
// Socket.IO Mock
// -----------------------------------------------------------------------------

/**
 * Mock for socket.io-client to prevent actual network connections in tests.
 */
vi.mock('socket.io-client', () => {
	const mockSocket = {
		connected: false,
		auth: {},
		connect: vi.fn(),
		disconnect: vi.fn(),
		emit: vi.fn(),
		on: vi.fn().mockReturnThis(),
		off: vi.fn().mockReturnThis(),
		once: vi.fn().mockReturnThis(),
	};

	return {
		io: vi.fn(() => mockSocket),
		Socket: vi.fn(),
	};
});
