import 'reflect-metadata';
import { useCallback, useEffect, useRef, useState, createElement } from 'my-react';
import { useNavigate, useParams, useQuery } from 'my-react-router';
import { fetchJsonWithAuth } from '@libs/fetchWithAuth';
import { tournamentSocket } from '@libs/socket';
import { useToast } from '@hook/useToast';
import { Modal } from '@/components/ui/modal/index';
import { useAuth } from '@/hook/useAuth';
import { ButtonStyle3 } from '@/components/ui/button/style3';
import { TournamentCreation } from '@/components/tournament/TournamentCreation';
import { TournamentLobby } from '@/components/tournament/TournamentLobby';
import { TournamentActive } from '@/components/tournament/TournamentActive';
import { TournamentResponse, TournamentVisibility } from '@/components/tournament/types';

const TOURNAMENT_TYPES = ['public', 'private'] as const;
const TOURNAMENT_SIZES = [4, 8, 16] as const;

export function TournamentPlayersPage() {
	const params = useParams();
	const navigate = useNavigate();
	const query = useQuery();
	const { toast } = useToast();
	const { user } = useAuth();

	const initialId = null;
	const [createdTournamentId, setCreatedTournamentId] = useState<string | null>(initialId);

	const [tournament, setTournament] = useState<TournamentResponse | null>(null);
	const [isLoadingTournament, setIsLoadingTournament] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const activeTournamentIdRef = useRef<string | null>(null);
	const [showCancelModal, setShowCancelModal] = useState(false);

	const tournamentType = params.tournamentType ?? '';
	const playersCount = Number(params.playersCount);
	const isValidType = TOURNAMENT_TYPES.includes(tournamentType as (typeof TOURNAMENT_TYPES)[number]);
	const isValidSize = TOURNAMENT_SIZES.includes(playersCount as (typeof TOURNAMENT_SIZES)[number]);

	useEffect(() => {
		const checkActiveTournament = async () => {
			try {
				const result = await fetchJsonWithAuth<TournamentResponse>(`/api/tournament/active`);
				if (result.ok && result.data && result.data.id) {
					console.log('[Frontend] Found active tournament:', result.data.id);
					setCreatedTournamentId(result.data.id);
				}
			} catch (e) {
				console.error('Failed to check active tournament', e);
			}
		};

		const queryId = query.get('id');
		if (queryId) {
			setCreatedTournamentId(queryId);
			checkActiveTournament();
		}

		return () => {
			console.log('[Frontend] TournamentPlayersPage unmounted');
		};
	}, []);

	useEffect(() => {
		if (!isValidType || !isValidSize) {
			navigate('/play');
			toast('Tournament settings not found', 'error');
		}
	}, [isValidType, isValidSize, navigate, toast]);

	const loadTournament = useCallback(async (id: string) => {
		activeTournamentIdRef.current = id;
		setIsLoadingTournament(true);
		setLoadError(null);
		setTournament(null);

		const result = await fetchJsonWithAuth<TournamentResponse>(`/api/tournament/${id}`);
		if (activeTournamentIdRef.current !== id) {
			return;
		}
		if (!result.ok || !result.data) {
			const message = result.error || 'Unable to load tournament';
			setLoadError(message);
			toast(message, 'error');
			setIsLoadingTournament(false);
			return;
		}

		setTournament(result.data);
		setIsLoadingTournament(false);
	}, [toast]);

	useEffect(() => {
		if (createdTournamentId && activeTournamentIdRef.current !== createdTournamentId) {
			loadTournament(createdTournamentId);
		}
	}, [createdTournamentId, loadTournament]);

	const handleRetryLoad = () => {
		if (createdTournamentId) {
			loadTournament(createdTournamentId);
		}
	};

	useEffect(() => {
		if (!tournament || !tournament.id) return;

		console.log('[Frontend] Connection status:', tournamentSocket.connected);
		tournamentSocket.on('connect', () => {
			console.log('[Frontend] Socket connected:', tournamentSocket.id);
			if (tournament?.id) {
				console.log('[Frontend] Emitting listen_tournament after connect');
				tournamentSocket.emit('listen_tournament', {
					tournamentId: tournament.id,
					displayName: 'Guest'
				});
			}
		});

		tournamentSocket.on('connect_error', (err) => {
			console.error('[Frontend] Socket connection error:', err);
		});

		if (tournament?.id) {
			console.log('[Frontend] Listening to tournament events for:', tournament.id);
			tournamentSocket.emit('listen_tournament', {
				tournamentId: tournament.id,
				displayName: 'Guest'
			});
		}

		const onPlayerJoined = (data: any) => {
			console.log('[Frontend] PlayerJoined event:', data);
			if (data.aggregateId === tournament?.id || data.tournamentId === tournament?.id) {
				const playerId = data.playerId || data.participantId;
				console.log('[Frontend] Processing join for player:', playerId);
				setTournament((prev) => {
					if (!prev) return null;
					if (prev.participants.some(p => p.id === playerId)) return prev;

					return {
						...prev,
						participants: [
							...prev.participants,
							{
								id: playerId,
								displayName: data.displayName,
								type: 'USER'
							}
						]
					};
				});
				toast(`Player ${data.displayName} joined!`, 'info');
			}
		};

		const onPlayerLeft = (data: any) => {
			console.log('[Frontend] PlayerLeft event:', data);
			if (data.aggregateId === tournament?.id) {
				const playerId = data.playerId;
				if (user && String(user.id) === playerId) {
					navigate('/play');
					return;
				}

				setTournament((prev) => {
					if (!prev) return null;
					return {
						...prev,
						participants: prev.participants.filter(p => p.id !== playerId)
					};
				});
			}
		}

		const onTournamentStarted = (data: any) => {
			console.log('[Frontend] TournamentStarted event:', data);
			if (data.aggregateId === tournament?.id || data.tournamentId === tournament?.id) {
				setTournament(prev => prev ? ({ ...prev, status: 'STARTED' }) : null);
				toast('Tournament started!', 'success');
			}
		};

		const onTournamentCancelled = (data: any) => {
			console.log('[Frontend] TournamentCancelled event:', data);
			if (data.aggregateId === tournament?.id || data.tournamentId === tournament?.id) {
				setTournament(prev => prev ? ({ ...prev, status: 'CANCELED' }) : null);
				setShowCancelModal(true);
			}
		};

		tournamentSocket.on('PlayerJoined', onPlayerJoined);
		tournamentSocket.on('PlayerLeft', onPlayerLeft);
		tournamentSocket.on('TournamentStarted', onTournamentStarted);
		tournamentSocket.on('TournamentCancelled', onTournamentCancelled);
		tournamentSocket.on('player_joined', onPlayerJoined);
		tournamentSocket.on('player_left', onPlayerLeft);
		tournamentSocket.on('tournament_started', onTournamentStarted);
		tournamentSocket.on('tournament_cancelled', onTournamentCancelled);

		return () => {
			tournamentSocket.off('PlayerJoined', onPlayerJoined);
			tournamentSocket.off('PlayerLeft', onPlayerLeft);
			tournamentSocket.off('TournamentStarted', onTournamentStarted);
			tournamentSocket.off('TournamentCancelled', onTournamentCancelled);
			tournamentSocket.off('player_joined', onPlayerJoined);
			tournamentSocket.off('player_left', onPlayerLeft);
			tournamentSocket.off('tournament_started', onTournamentStarted);
			tournamentSocket.off('tournament_cancelled', onTournamentCancelled);
			tournamentSocket.off('connect');
			tournamentSocket.off('connect_error');
		};
	}, [tournament?.id, toast, user]);

	const handleCancelTournament = async () => {
		if (!tournament?.id) return;

		try {
			const result = await fetchJsonWithAuth(`/api/tournament/${tournament.id}`, {
				method: 'DELETE',
				body: JSON.stringify({}),
			});

			if (result.ok) {
				toast('Tournament canceled', 'success');
				setCreatedTournamentId(null);
				setTournament(null);
				navigate('/play');
			} else {
				toast(result.error || 'Failed to cancel tournament', 'error');
			}
		} catch (error) {
			console.error('Failed to cancel tournament', error);
			toast('An error occurred', 'error');
		}
	};

	const handleLeaveTournament = async () => {
		if (!tournament?.id) return;

		try {
			const result = await fetchJsonWithAuth(`/api/tournament/${tournament.id}/leave`, {
				method: 'POST',
				body: JSON.stringify({}),
			});

			if (result.ok) {
				toast('You left the tournament', 'success');
				setCreatedTournamentId(null);
				setTournament(null);
				navigate('/play');
			} else {
				toast(result.error || 'Failed to leave tournament', 'error');
			}
		} catch (error) {
			console.error('Failed to leave tournament', error);
			toast('An error occurred', 'error');
		}
	};

	const handleCloseModal = () => {
		setShowCancelModal(false);
		navigate('/play');
	};

	const handleTournamentCreated = (id: string) => {
		setCreatedTournamentId(id);
		// Note: URL update logic was in handleSubmit but maybe we should do it here if needed?
		// The original code did: navigate(`/play/tournament/${tournamentType}/${playersCount}?id=${result.data.id}`);
		// Let's do that to ensure URL consistency.
		navigate(`/play/tournament/${tournamentType}/${playersCount}?id=${id}`);
	};

	if (!isValidType || !isValidSize) {
		return null;
	}

	const isOwner = user && tournament && String(user.id) === tournament.ownerId;

	return (
		<div className="relative size-full">
			<div className="relative z-10 flex h-full flex-col items-center justify-center gap-10 p-4">
				<h2 className="text-4xl font-bold text-white font-pirulen tracking-widest">Play</h2>
				{!createdTournamentId ? (
					<TournamentCreation
						tournamentType={tournamentType}
						playersCount={playersCount}
						onTournamentCreated={handleTournamentCreated}
					/>
				) : (
					// Check if tournament is started
					tournament?.status === 'STARTED' ? (
						<TournamentActive tournament={tournament} />
					) : (
						<TournamentLobby
							tournament={tournament}
							tournamentName="" // Fallback if name not loaded yet, though tournament object has it
							isOwner={!!isOwner}
							isLoading={isLoadingTournament}
							loadError={loadError}
							onRetry={handleRetryLoad}
							onCancel={handleCancelTournament}
							onLeave={handleLeaveTournament}
						/>
					)
				)}
			</div>
			{
				showCancelModal && (
					<Modal
						variant="cyan"
						title="Tournament Cancelled"
						onClose={handleCloseModal}
					>
						<div className="flex flex-col gap-4 text-center">
							<p className="text-gray-300">
								The tournament has been cancelled by the host.
							</p>
							<ButtonStyle3 onClick={handleCloseModal}>
								Return to Play
							</ButtonStyle3>
						</div>
					</Modal>
				)
			}
		</div >
	);
}
