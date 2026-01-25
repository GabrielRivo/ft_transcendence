// =============================================================================
// Matchmaking Component
// =============================================================================
//
// This component provides the user interface for the matchmaking system.
// It displays the current matchmaking status and allows users to:
// - Join/leave the matchmaking queue
// - Accept/decline match proposals (ready check)
// - View queue statistics
//
// ## Visual States
//
// 1. IDLE: "Find Match" button displayed
// 2. CONNECTING: Loading animation while connecting
// 3. SEARCHING: Animated search indicator with cancel button
// 4. MATCH_FOUND: Ready check UI with Accept/Decline buttons and countdown
// 5. WAITING_OPPONENT: Waiting for opponent to accept
// 6. MATCH_CONFIRMED: Success animation before redirect
// 7. ERROR: Error message with retry option
//
// ## Design Philosophy
//
// The component follows the cyberpunk/neon aesthetic of the application,
// using cyan and purple gradients with glowing effects. The UI is designed
// to be responsive and provide clear feedback at each stage of matchmaking.
//
// =============================================================================

import { createElement, useEffect, FragmentComponent } from 'my-react';
import { useNavigate } from 'my-react-router';
import { useMatchmaking, type MatchProposal, type QueueStats } from '../../hook/useMatchmaking';

// -----------------------------------------------------------------------------
// Sub-Components
// -----------------------------------------------------------------------------

/**
 * Animated loading dots for waiting states.
 */
function LoadingDots() {
	return (
		<span className="inline-flex gap-1">
			<span className="animate-pulse" style="animation-delay: 0ms;">
				.
			</span>
			<span className="animate-pulse" style="animation-delay: 200ms;">
				.
			</span>
			<span className="animate-pulse" style="animation-delay: 400ms;">
				.
			</span>
		</span>
	);
}

/**
 * Circular progress indicator showing time remaining for match acceptance.
 */
function CountdownTimer({ remainingTime, maxTime = 15 }: { remainingTime: number; maxTime?: number }) {
	// Calculate progress percentage
	const progress = remainingTime / maxTime;
	const circumference = 2 * Math.PI * 45; // radius = 45
	const strokeDashoffset = circumference * (1 - progress);

	// Color transitions from cyan to red as time runs out
	const getColor = () => {
		if (remainingTime > 10) return '#22d3d3'; // cyan
		if (remainingTime > 5) return '#f59e0b'; // amber
		return '#ef4444'; // red
	};

	return (
		<div className="relative flex h-28 w-28 items-center justify-center">
			{/* Background circle */}
			<svg className="absolute h-full w-full -rotate-90">
				<circle cx="56" cy="56" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
				{/* Progress circle */}
				<circle
					cx="56"
					cy="56"
					r="45"
					fill="none"
					stroke={getColor()}
					strokeWidth="6"
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={strokeDashoffset}
					style="transition: stroke-dashoffset 1s linear, stroke 0.3s ease;"
				/>
			</svg>
			{/* Time display */}
			<span className="font-orbitron text-4xl font-bold" style={`color: ${getColor()}; transition: color 0.3s ease;`}>
				{remainingTime}
			</span>
		</div>
	);
}

/**
 * Queue statistics display showing players in queue and pending matches.
 * Returns an empty fragment when no stats are available (my-react doesn't handle null returns well).
 */
function QueueStatsDisplay({ stats }: { stats: QueueStats | null }) {
	if (!stats) {
		// Return empty fragment instead of null for my-react compatibility
		return <FragmentComponent>{[]}</FragmentComponent>;
	}

	return (
		<div className="mt-4 flex gap-6 text-xs text-gray-400">
			<div className="flex items-center gap-2">
				<span className="h-2 w-2 animate-pulse rounded-full bg-cyan-500" />
				<span>
					<span className="font-bold text-cyan-400">{stats.size}</span> in queue
				</span>
			</div>
			<div className="flex items-center gap-2">
				<span className="h-2 w-2 animate-pulse rounded-full bg-purple-500" />
				<span>
					<span className="font-bold text-purple-400">{stats.pending}</span> matches pending
				</span>
			</div>
		</div>
	);
}

/**
 * Pulsating search animation displayed while in queue.
 */
function SearchingAnimation() {
	return (
		<div className="relative flex h-32 w-32 items-center justify-center">
			{/* Outer pulsing rings */}
			<div className="absolute h-full w-full animate-ping rounded-full border-2 border-cyan-500/30" />
			<div
				className="absolute h-3/4 w-3/4 animate-ping rounded-full border-2 border-cyan-500/20"
				style="animation-delay: 500ms;"
			/>
			{/* Center icon */}
			<div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-cyan-500 bg-cyan-500/10">
				<svg className="h-8 w-8 animate-spin text-cyan-400" fill="none" viewBox="0 0 24 24">
					<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
					<path
						className="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					/>
				</svg>
			</div>
		</div>
	);
}

/**
 * Match found display showing opponent info and accept/decline buttons.
 */
function MatchFoundDisplay({
	proposal,
	remainingTime,
	onAccept,
	onDecline,
	isWaiting,
}: {
	proposal: MatchProposal;
	remainingTime: number | null;
	onAccept: () => void;
	onDecline: () => void;
	isWaiting: boolean;
}) {
	return (
		<div className="flex flex-col items-center gap-6">
			{/* Title */}
			<h2 className="font-pirulen text-xl tracking-widest text-cyan-400">
				{isWaiting ? 'WAITING FOR OPPONENT' : 'MATCH FOUND'}
			</h2>

			{/* Countdown timer */}
			{remainingTime !== null && <CountdownTimer remainingTime={remainingTime} />}

			{/* Opponent info */}
			<div className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-6 py-3">
				<div className="text-xs text-gray-400 uppercase">Opponent ELO</div>
				<div className="font-orbitron text-2xl font-bold text-purple-400">{proposal.opponentElo}</div>
			</div>

			{/* Action buttons */}
			{!isWaiting ? (
				<div className="flex gap-4">
					{/* Accept button */}
					<button
						onClick={onAccept}
						className="group relative overflow-hidden rounded-lg border-2 border-green-500 bg-green-500/10 px-8 py-3 font-bold text-green-400 transition-all duration-300 hover:bg-green-500/30 hover:text-white hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
					>
						<span className="relative z-10">ACCEPT</span>
						<div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-green-500/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
					</button>

					{/* Decline button */}
					<button
						onClick={onDecline}
						className="group relative overflow-hidden rounded-lg border-2 border-red-500 bg-red-500/10 px-8 py-3 font-bold text-red-400 transition-all duration-300 hover:bg-red-500/30 hover:text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]"
					>
						<span className="relative z-10">DECLINE</span>
						<div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-red-500/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
					</button>
				</div>
			) : (
				<p className="text-sm text-gray-400">
					Waiting for opponent to accept
					<LoadingDots />
				</p>
			)}

			{/* Warning about penalty */}
			{!isWaiting && (
				<p className="text-xs text-gray-500">⚠️ Declining or timing out will result in a temporary penalty</p>
			)}
		</div>
	);
}

/**
 * Success animation displayed when match is confirmed.
 */
function MatchConfirmedDisplay() {
	return (
		<div className="flex flex-col items-center gap-4">
			{/* Success icon */}
			<div className="flex h-20 w-20 animate-pulse items-center justify-center rounded-full border-2 border-green-500 bg-green-500/20">
				<svg className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
				</svg>
			</div>

			{/* Success message */}
			<h2 className="font-pirulen text-xl tracking-widest text-green-400">MATCH CONFIRMED</h2>
			<p className="text-sm text-gray-400">
				Redirecting to game
				<LoadingDots />
			</p>
		</div>
	);
}

/**
 * Error display with retry option.
 */
function ErrorDisplay({ message, onRetry }: { message: string; onRetry: () => void }) {
	return (
		<div className="flex flex-col items-center gap-4">
			{/* Error icon */}
			<div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-500 bg-red-500/20">
				<svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
			</div>

			{/* Error message */}
			<p className="text-center text-sm text-red-400">{message}</p>

			{/* Retry button */}
			<button
				onClick={onRetry}
				className="rounded border border-cyan-500/50 bg-cyan-500/10 px-6 py-2 text-sm text-cyan-400 transition-all hover:bg-cyan-500/20 hover:text-white"
			>
				Try Again
			</button>
		</div>
	);
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

/**
 * Main Matchmaking component that orchestrates the matchmaking flow.
 *
 * This component renders different UI states based on the current
 * matchmaking status and handles navigation to the game when a match
 * is confirmed.
 */
export function Matchmaking() {
	const navigate = useNavigate();
	const {
		connected,
		status,
		currentProposal,
		confirmedMatch,
		queueStats,
		remainingTime,
		error,
		joinQueue,
		leaveQueue,
		acceptMatch,
		declineMatch,
		resetState,
	} = useMatchmaking();

	// Debug log pour diagnostiquer le problème du bouton désactivé
	console.info('[Matchmaking] Render state - connected:', connected, 'status:', status, 'error:', error);
	console.info('[Matchmaking] Queue stats:', queueStats);

	// -------------------------------------------------------------------------
	// Navigation Effect
	// -------------------------------------------------------------------------

	/**
	 * Navigates to the game page when a match is confirmed.
	 * Uses a small delay for the success animation to be visible.
	 */
	useEffect(() => {
		if (status === 'MATCH_CONFIRMED' && confirmedMatch) {
			const timeout = setTimeout(() => {
				// Navigate to the game with the gameId as a query parameter
				navigate(`/game?id=${confirmedMatch.gameId}&type=ranked`);
				resetState();
			}, 1500);

			return () => clearTimeout(timeout);
		}
	}, [status, confirmedMatch, navigate, resetState]);

	// -------------------------------------------------------------------------
	// Render Helpers
	// -------------------------------------------------------------------------

	/**
	 * Renders the appropriate content based on current status.
	 */
	const renderContent = () => {
		// Handle error state
		if (error && status === 'ERROR') {
			return <ErrorDisplay message={error} onRetry={resetState} />;
		}

		switch (status) {
			case 'CONNECTING':
				return (
					<div className="flex flex-col items-center gap-4">
						<div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
						<p className="text-sm text-gray-400">
							Connecting to matchmaking service
							<LoadingDots />
						</p>
					</div>
				);

			case 'SEARCHING':
				return (
					<div className="flex flex-col items-center gap-6">
						<SearchingAnimation />
						<div className="text-center pointer-events-none">
							<h2 className="font-pirulen text-lg tracking-widest text-cyan-400">SEARCHING</h2>
							<p className="mt-2 text-sm text-gray-400">
								Looking for an opponent
								<LoadingDots />
							</p>
						</div>
						<button
							onClick={leaveQueue}
							className="rounded z-10 border border-gray-500/50 bg-gray-500/10 px-6 py-2 text-sm text-gray-400 transition-all hover:bg-gray-500/20 hover:text-white"
						>
							Cancel
						</button>
						<QueueStatsDisplay stats={queueStats} />
					</div>
				);

			case 'MATCH_FOUND':
				// Guard: Show loading if proposal not yet received
				if (!currentProposal) {
					return (
						<div className="flex flex-col items-center gap-4">
							<div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
							<p className="text-sm text-gray-400">Loading match details...</p>
						</div>
					);
				}
				return (
					<MatchFoundDisplay
						proposal={currentProposal}
						remainingTime={remainingTime}
						onAccept={acceptMatch}
						onDecline={declineMatch}
						isWaiting={false}
					/>
				);

			case 'WAITING_OPPONENT':
				// Guard: Show loading if proposal not yet received
				if (!currentProposal) {
					return (
						<div className="flex flex-col items-center gap-4">
							<div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
							<p className="text-sm text-gray-400">Loading match details...</p>
						</div>
					);
				}
				return (
					<MatchFoundDisplay
						proposal={currentProposal}
						remainingTime={remainingTime}
						onAccept={acceptMatch}
						onDecline={declineMatch}
						isWaiting={true}
					/>
				);

			case 'MATCH_CONFIRMED':
				return <MatchConfirmedDisplay />;

			case 'IDLE':
			default:
				return (
					<div className="flex flex-col items-center gap-6">
						{/* Main action button */}
						<button
							onClick={joinQueue}
							disabled={!connected}
							className="group font-pirulen relative overflow-hidden rounded-xl border-2 border-cyan-500 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 px-12 py-4 text-lg tracking-widest text-cyan-400 transition-all duration-300 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
						>
							<span className="relative z-10">FIND MATCH</span>
							{/* Animated gradient overlay */}
							<div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
						</button>

						{/* Connection status */}
						<div className="flex items-center gap-2 text-xs">
							<span className={`h-2 w-2 rounded-full ${connected ? 'animate-pulse bg-green-500' : 'bg-red-500'}`} />
							<span className={connected ? 'text-green-400' : 'text-red-400'}>
								{connected ? 'Connected' : 'Disconnected'}
							</span>
						</div>

						{/* Queue stats when available */}
						<QueueStatsDisplay stats={queueStats} />

						{/* Error message if any */}
						{error && <p className="mt-2 text-center text-sm text-red-400">{error}</p>}
					</div>
				);
		}
	};

	// -------------------------------------------------------------------------
	// Main Render
	// -------------------------------------------------------------------------

	return (
		<div className="flex h-full flex-col items-center justify-center p-8">
			{/* Card container with glassmorphism effect */}
			<div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950/80 p-8 shadow-[0_0_40px_rgba(6,182,212,0.1)] backdrop-blur-xl">
				{/* Header */}
				<div className="mb-8 text-center">
					<h1 className="font-pirulen text-2xl tracking-[0.2em] text-white">MATCHMAKING</h1>
					<div className="mx-auto mt-2 h-[2px] w-16 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
				</div>

				{/* Dynamic content based on status */}
				<div className="flex min-h-[300px] items-center justify-center">{renderContent()}</div>

				{/* Decorative corner elements */}
				<div className="absolute top-0 left-0 h-8 w-8 border-t-2 border-l-2 border-cyan-500/50" />
				<div className="absolute top-0 right-0 h-8 w-8 border-t-2 border-r-2 border-cyan-500/50" />
				<div className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-cyan-500/50" />
				<div className="absolute right-0 bottom-0 h-8 w-8 border-r-2 border-b-2 border-cyan-500/50" />
			</div>
		</div>
	);
}

export default Matchmaking;
