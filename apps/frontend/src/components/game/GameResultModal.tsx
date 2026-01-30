import { createElement, useState, useEffect } from 'my-react';
import { useNavigate } from 'my-react-router';
import { Modal } from '@/components/ui/modal';
import { ButtonStyle3 } from '@/components/ui/button/style3';
import { GameResult } from '@/context/gameContext';
import { useAuth } from '@/hook/useAuth';

interface PlayerProfile {
	id: number;
	username: string;
	avatar: string | null;
}

interface MatchHistoryEntry {
	game_id: string;
	player1_id: number;
	player2_id: number;
	gain_player1: number | null;
	gain_player2: number | null;
}

interface GameResultModalProps {
	result: GameResult;
	onClose: () => void;
}

export function GameResultModal({ result, onClose }: GameResultModalProps) {
	const navigate = useNavigate();
	const { user } = useAuth();

	const [player1Profile, setPlayer1Profile] = useState<PlayerProfile | null>(null);
	const [player2Profile, setPlayer2Profile] = useState<PlayerProfile | null>(null);
	const [eloChanges, setEloChanges] = useState<{ player1: number | null; player2: number | null }>({
		player1: null,
		player2: null,
	});
	const [isLoading, setIsLoading] = useState(true);

	const userId = user?.id ? String(user.id) : null;
	const isPlayer1 = userId === result.player1Id;
	const isWinner = userId === result.winnerId;
	const isDraw = result.winnerId === null;

	// Fetch player profiles
	useEffect(() => {
		const fetchProfiles = async () => {
			try {
				const [p1Response, p2Response] = await Promise.all([
					fetch(`/api/user/profile/${result.player1Id}`, { credentials: 'include' }),
					fetch(`/api/user/profile/${result.player2Id}`, { credentials: 'include' }),
				]);

				if (p1Response.ok) {
					const p1Data = await p1Response.json();
					setPlayer1Profile(p1Data);
				}
				if (p2Response.ok) {
					const p2Data = await p2Response.json();
					setPlayer2Profile(p2Data);
				}
			} catch (error) {
				// console.error('Failed to fetch player profiles:', error);
			}
		};

		if (result.player1Id && result.player2Id) {
			fetchProfiles();
		}
	}, [result.player1Id, result.player2Id]);

	// Fetch ELO changes after a short delay (stats are calculated async via RabbitMQ)
	useEffect(() => {
		const fetchEloChanges = async () => {
			try {
				// Wait for stats service to process the game
				await new Promise((resolve) => setTimeout(resolve, 800));

				const response = await fetch(`/api/stats/match-history/user/${result.player1Id}`, {
					credentials: 'include',
				});

				if (response.ok) {
					const history: MatchHistoryEntry[] = await response.json();
					// Find the most recent match (first entry)
					if (history.length > 0) {
						const latestMatch = history[0];
						setEloChanges({
							player1: latestMatch.gain_player1,
							player2: latestMatch.gain_player2,
						});
					}
				}
			} catch (error) {
				// console.error('Failed to fetch ELO changes:', error);
			} finally {
				setIsLoading(false);
			}
		};

		if (result.player1Id) {
			fetchEloChanges();
		}
	}, [result.player1Id]);

	const handleReturn = () => {
		onClose();
		navigate('/play');
	};

	const myProfile = isPlayer1 ? player1Profile : player2Profile;
	const opponentProfile = isPlayer1 ? player2Profile : player1Profile;
	const myScore = isPlayer1 ? result.player1Score : result.player2Score;
	const opponentScore = isPlayer1 ? result.player2Score : result.player1Score;
	const myEloChange = isPlayer1 ? eloChanges.player1 : eloChanges.player2;
	const opponentEloChange = isPlayer1 ? eloChanges.player2 : eloChanges.player1;

	const formatEloChange = (change: number | null) => {
		if (change === null) return null;
		return change >= 0 ? `+${change}` : `${change}`;
	};

	const getEloColor = (change: number | null) => {
		if (change === null) return 'text-gray-400';
		return change >= 0 ? 'text-green-400' : 'text-red-400';
	};

	return (
		<Modal onClose={handleReturn} title={false} variant="cyan">
			<div className="flex flex-col items-center gap-6 py-4">
				{/* Result Header */}
				<div className="text-center">
					{isDraw ? (
						<h2 className="font-pirulen text-2xl tracking-widest text-gray-400">DRAW</h2>
					) : isWinner ? (
						<h2 className="font-pirulen text-2xl tracking-widest text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]">
							VICTORY
						</h2>
					) : (
						<h2 className="font-pirulen text-2xl tracking-widest text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]">
							DEFEAT
						</h2>
					)}
				</div>

				{/* Players Display */}
				<div className="flex w-full items-center justify-center gap-6">
					{/* Current User */}
					<div className="flex flex-col items-center gap-3">
						{/* Avatar */}
						<div className="relative">
							<div
								className={`h-16 w-16 overflow-hidden rounded-full border-2 ${
									isWinner ? 'border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'border-gray-500'
								}`}
							>
								{myProfile?.avatar ? (
									<img
										src={myProfile.avatar}
										alt={myProfile.username}
										className="h-full w-full object-cover"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center bg-slate-800 text-xl font-bold text-gray-400">
										{myProfile?.username?.charAt(0)?.toUpperCase() || '?'}
									</div>
								)}
							</div>
							{isWinner && (
								<div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-xs">
									👑
								</div>
							)}
						</div>

						{/* Username */}
						<span className="font-orbitron text-sm text-cyan-400 max-w-20 truncate">
							{myProfile?.username || 'Loading...'}
						</span>

						{/* Score */}
						<span className={`font-pirulen text-4xl ${isWinner ? 'text-cyan-400' : 'text-gray-300'}`}>
							{myScore}
						</span>

						{/* ELO Change */}
						{!isLoading && myEloChange !== null && (
							<span className={`font-mono text-sm font-bold ${getEloColor(myEloChange)}`}>
								{formatEloChange(myEloChange)} ELO
							</span>
						)}
						{isLoading && <span className="font-mono text-xs text-gray-500">Calculating...</span>}
					</div>

					{/* VS Separator */}
					<div className="flex flex-col items-center justify-center px-4">
						<span className="font-pirulen text-xl text-gray-500">VS</span>
					</div>

					{/* Opponent */}
					<div className="flex flex-col items-center gap-3">
						{/* Avatar */}
						<div className="relative">
							<div
								className={`h-16 w-16 overflow-hidden rounded-full border-2 ${
									!isWinner && !isDraw
										? 'border-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.4)]'
										: 'border-gray-500'
								}`}
							>
								{opponentProfile?.avatar ? (
									<img
										src={opponentProfile.avatar}
										alt={opponentProfile.username}
										className="h-full w-full object-cover"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center bg-slate-800 text-xl font-bold text-gray-400">
										{opponentProfile?.username?.charAt(0)?.toUpperCase() || '?'}
									</div>
								)}
							</div>
							{!isWinner && !isDraw && (
								<div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-xs">
									👑
								</div>
							)}
						</div>

						{/* Username */}
						<span className="font-orbitron text-sm text-pink-400 max-w-20 truncate">
							{opponentProfile?.username || 'Loading...'}
						</span>

						{/* Score */}
						<span
							className={`font-pirulen text-4xl ${
								!isWinner && !isDraw ? 'text-pink-400' : 'text-gray-300'
							}`}
						>
							{opponentScore}
						</span>

						{/* ELO Change */}
						{!isLoading && opponentEloChange !== null && (
							<span className={`font-mono text-sm font-bold ${getEloColor(opponentEloChange)}`}>
								{formatEloChange(opponentEloChange)} ELO
							</span>
						)}
						{isLoading && <span className="font-mono text-xs text-gray-500">Calculating...</span>}
					</div>
				</div>

				{/* Decorative line */}
				<div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

				{/* Return Button */}
				<ButtonStyle3 onClick={handleReturn}>Return to Play</ButtonStyle3>
			</div>
		</Modal>
	);
}
