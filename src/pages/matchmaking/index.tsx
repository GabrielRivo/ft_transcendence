// =============================================================================
// Matchmaking Page
// =============================================================================
//
// This page provides the full-screen matchmaking experience. It wraps the
// Matchmaking component and handles the game navigation when a match is
// confirmed.
//
// ## Route
//
// /matchmaking - Authenticated users only
//
// ## Navigation Flow
//
// Dashboard -> Matchmaking -> Game (when match is confirmed)
//
// =============================================================================

import { createElement, useEffect } from 'my-react';
import { useNavigate } from 'my-react-router';
import { Matchmaking } from '../../components/matchmaking';
import { ButtonStyle3 } from '../../components/ui/button/style3';
import { useAuth } from '@/hook/useAuth';
import { useToast } from '@/hook/useToast';

/**
 * Matchmaking page component.
 *
 * Provides a full-screen matchmaking experience with a back button
 * to return to the dashboard if the user changes their mind.
 */
export function MatchmakingPage() {
	const navigate = useNavigate();
	const { user } = useAuth();
	const { toast } = useToast();

	const handleBack = () => {
		navigate('/play');
	};

	useEffect(() => {
		if (user?.isGuest) {
			toast('Please have an account to use all features', 'error');
			navigate('/play');
		}
	}, [user?.isGuest]);

	return (
		<div className="relative flex min-h-full flex-col text-white">
			{/* Background gradient effect */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute top-1/4 -left-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
				<div className="absolute -right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />
			</div>

			{/* Header with back button */}
			<div className="relative z-10 flex items-center justify-between p-6">
				<ButtonStyle3 onClick={handleBack}>← Return</ButtonStyle3>
			</div>

			{/* Main content */}
			<div className="relative z-10 flex flex-1 items-center justify-center">
				<Matchmaking />
			</div>

			{/* Footer with instructions */}
			<div className="relative z-10 p-6 text-center text-xs text-gray-500">
				<p>
					Matchmaking connects you with players of a similar skill level.
					<br />
					You have 15 seconds to accept a match found.
				</p>
			</div>
		</div>
	);
}
