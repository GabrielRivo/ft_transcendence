import 'reflect-metadata';
import { useCallback, useEffect, useState, createElement } from 'my-react';
import { useNavigate, useParams, useQuery } from 'my-react-router';
import { useToast } from '@hook/useToast';
import { useTournament } from '@hook/useTournament';
import { Modal } from '@/components/ui/modal/index';
import { useAuth } from '@/hook/useAuth';
import { ButtonStyle3 } from '@/components/ui/button/style3';
import { TournamentCreation } from '@/components/tournament/TournamentCreation';
import { TournamentLobby } from '@/components/tournament/TournamentLobby';
import { TournamentActive } from '@/components/tournament/TournamentActive';
import { TournamentFinished } from '@/components/tournament/TournamentFinished';

const TOURNAMENT_TYPES = ['public', 'private'] as const;
const TOURNAMENT_SIZES = [4, 8, 16] as const;

export function TournamentPlayersPage() {
	const params = useParams();
	const navigate = useNavigate();
	const query = useQuery();
	const { toast } = useToast();
	const { user } = useAuth();

	// Use the tournament hook for socket management
	const {
		tournament,
		isLoading: isLoadingTournament,
		loadError,
		showCancelModal,
		setShowCancelModal,
		loadTournament,
		cancelTournament,
		leaveTournament,
		listenToTournament,
		winnerId,
	} = useTournament();

	const [createdTournamentId, setCreatedTournamentId] = useState<string | null>(null);

	const tournamentType = params.tournamentType ?? '';
	const playersCount = Number(params.playersCount);
	const isValidType = TOURNAMENT_TYPES.includes(tournamentType as (typeof TOURNAMENT_TYPES)[number]);
	const isValidSize = TOURNAMENT_SIZES.includes(playersCount as (typeof TOURNAMENT_SIZES)[number]);

	// Validate route params
	useEffect(() => {
		if (!isValidType || !isValidSize) {
			navigate('/play');
			toast('Tournament settings not found', 'error');
		}
	}, [isValidType, isValidSize, navigate, toast]);

	// Read tournament ID from URL query on mount
	const queryId = query.get('id');

	useEffect(() => {
		if (queryId && queryId !== createdTournamentId) {
			// console.log('[TournamentPage] Found tournament ID in URL:', queryId);
			setCreatedTournamentId(queryId);
		}
	}, [queryId, createdTournamentId]); // depend on queryId string, not query object

	// Load and listen to tournament when ID changes
	useEffect(() => {
		if (createdTournamentId) {
			loadTournament(createdTournamentId);
			listenToTournament(createdTournamentId);
		}
	}, [createdTournamentId, loadTournament, listenToTournament]);

	const handleRetryLoad = useCallback(() => {
		if (createdTournamentId) {
			loadTournament(createdTournamentId);
		}
	}, [createdTournamentId, loadTournament]);

	const handleCloseModal = useCallback(() => {
		setShowCancelModal(false);
		navigate('/play');
	}, [setShowCancelModal, navigate]);

	const handleTournamentCreated = useCallback((id: string) => {
		setCreatedTournamentId(id);
		navigate(`/play/tournament/${tournamentType}/${playersCount}?id=${id}`);
	}, [navigate, tournamentType, playersCount]);

	if (!isValidType || !isValidSize) {
		return null;
	}

	const isOwner = user && tournament && String(user.id) === tournament.ownerId;

	return (
		<div className="relative size-full">
			<div className="relative z-10 flex h-full flex-col items-center justify-center py-4 px-2 overflow-auto">
				{!createdTournamentId ? (
					<TournamentCreation
						tournamentType={tournamentType}
						playersCount={playersCount}
						onTournamentCreated={handleTournamentCreated}
					/>
				) : (
					// Check tournament status
					tournament?.status === 'FINISHED' && winnerId ? (
						<TournamentFinished tournament={tournament} winnerId={winnerId} />
					) : tournament?.status === 'STARTED' ? (
						<TournamentActive tournament={tournament} />
					) : (
						<TournamentLobby
							tournament={tournament}
							tournamentName="" // Fallback if name not loaded yet
							isOwner={!!isOwner}
							isLoading={isLoadingTournament}
							loadError={loadError}
							onRetry={handleRetryLoad}
							onCancel={cancelTournament}
							onLeave={leaveTournament}
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
