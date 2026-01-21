import 'reflect-metadata';
import { createElement, useCallback, useEffect, useRef, useState } from 'my-react';
import { Link, useNavigate, useParams } from 'my-react-router';
import { ButtonStyle4 } from '@/components/ui/button/style4';
import { ButtonStyle3 } from '@/components/ui/button/style3';
import { CardStyle2 } from '@/components/ui/card/style2';
import { fetchJsonWithAuth } from '@libs/fetchWithAuth';
import { useToast } from '@hook/useToast';
import { useValidation, ValidationError } from '@hook/useValidation';
import { CreateTournamentSchema } from '../../dto';

const TOURNAMENT_TYPES = ['public', 'private'] as const;
const TOURNAMENT_SIZES = [4, 8, 16] as const;

type TournamentVisibility = 'PUBLIC' | 'PRIVATE';
type TournamentStatus = 'CREATED' | 'STARTED' | 'FINISHED' | 'CANCELED';

interface TournamentParticipant {
	id: string;
	displayName: string;
	type: string;
}

interface TournamentResponse {
	id: string;
	name: string;
	size: number;
	visibility: TournamentVisibility;
	status: TournamentStatus;
	participants: TournamentParticipant[];
}

interface CreateTournamentResponse {
	id: string;
}

export function TournamentPlayersPage() {
	const params = useParams();
	const navigate = useNavigate();
	const { toast } = useToast();
	const { validate, getFieldError } = useValidation(CreateTournamentSchema);

	const [tournamentName, setTournamentName] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errors, setErrors] = useState<ValidationError[]>([]);
	const [createdTournamentId, setCreatedTournamentId] = useState<string | null>(null);
	const [tournament, setTournament] = useState<TournamentResponse | null>(null);
	const [isLoadingTournament, setIsLoadingTournament] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const activeTournamentIdRef = useRef<string | null>(null);

	const tournamentType = params.tournamentType ?? '';
	const playersCount = Number(params.playersCount);
	const isValidType = TOURNAMENT_TYPES.includes(tournamentType as (typeof TOURNAMENT_TYPES)[number]);
	const isValidSize = TOURNAMENT_SIZES.includes(playersCount as (typeof TOURNAMENT_SIZES)[number]);
	const visibility: TournamentVisibility = tournamentType === 'private' ? 'PRIVATE' : 'PUBLIC';

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
		if (createdTournamentId) {
			loadTournament(createdTournamentId);
		}
	}, [createdTournamentId, loadTournament]);

	const handleSubmit = async (e: Event): Promise<void> => {
		e.preventDefault();
		if (!isValidType || !isValidSize) return;

		setErrors([]);
		const trimmedName = tournamentName.trim();
		const payload = {
			name: trimmedName,
			size: playersCount,
			visibility,
		};

		const validation = validate(payload);
		if (!validation.valid) {
			setErrors(validation.errors);
			toast('Please fix the errors', 'warning');
			return;
		}

		setIsSubmitting(true);

		const result = await fetchJsonWithAuth<CreateTournamentResponse>('/api/tournament', {
			method: 'POST',
			body: JSON.stringify(payload),
		});

		if (!result.ok || !result.data?.id) {
			toast(result.error || 'Tournament creation failed', 'error');
			setIsSubmitting(false);
			return;
		}

		setCreatedTournamentId(result.data.id);
		toast('Tournament created', 'success');
		setIsSubmitting(false);
	};

	const handleCreateAnother = () => {
		activeTournamentIdRef.current = null;
		setTournamentName('');
		setErrors([]);
		setCreatedTournamentId(null);
		setTournament(null);
		setLoadError(null);
		setIsLoadingTournament(false);
	};

	const handleRetryLoad = () => {
		if (createdTournamentId) {
			loadTournament(createdTournamentId);
		}
	};

	const nameError = getFieldError(errors, 'name');

	if (!isValidType || !isValidSize) {
		return null;
	}

	return (
		<div className="relative size-full">
			<div className="relative z-10 flex h-full flex-col items-center justify-center gap-10 p-4">
				<h2 className="text-4xl font-bold text-white font-pirulen tracking-widest">Play</h2>
				{!createdTournamentId ? (
					<CardStyle2 className="w-full max-w-xl">
						<div className="flex w-full flex-col gap-8">
							<div className="text-center">
								<h3 className="font-pirulen text-xl tracking-widest text-white">Create Tournament</h3>
								<p className="mt-2 text-sm text-gray-400">Name your tournament and start inviting players.</p>
							</div>
							<div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-300">
								<span className="rounded-sm border border-white/10 bg-white/5 px-3 py-1">Type: {tournamentType}</span>
								<span className="rounded-sm border border-white/10 bg-white/5 px-3 py-1">Players: {playersCount}</span>
							</div>
							<form className="flex flex-col gap-6" onSubmit={handleSubmit}>
								<div className="group flex flex-col gap-2">
									<label
										htmlFor="tournamentName"
										className="font-pirulen text-xs tracking-wider text-gray-400 transition-colors group-focus-within:text-white"
									>
										Tournament name
									</label>
									<input
										type="text"
										id="tournamentName"
										name="tournamentName"
										value={tournamentName}
										onInput={(e: Event) => setTournamentName((e.target as HTMLInputElement).value)}
										className={`focus:border-neon-blue w-full rounded-sm border bg-transparent p-3 text-sm text-white transition-all duration-300 outline-none placeholder:text-gray-600 focus:bg-white/5 ${nameError ? 'border-red-500' : 'border-white/10'}`}
										placeholder="Neon Cup"
										autoFocus
									/>
									{nameError && <span className="text-xs text-red-400">{nameError}</span>}
									<p className="text-xs text-gray-500">3-50 characters, letters and numbers recommended.</p>
								</div>
								<div className="mt-4 flex flex-col items-center gap-2">
									<ButtonStyle4 type="submit" disabled={isSubmitting}>
										{isSubmitting ? 'CREATING...' : 'CREATE TOURNAMENT'}
									</ButtonStyle4>
									<Link
										to={`/play/tournament/${tournamentType}`}
										className="text-center font-pirulen text-xs font-bold tracking-widest text-gray-400 hover:text-neon-blue"
									>
										Change players
									</Link>
									<Link
										to="/play"
										className="text-center font-pirulen text-xs font-bold tracking-widest text-gray-400 hover:text-neon-blue"
									>
										Return
									</Link>
								</div>
							</form>
						</div>
					</CardStyle2>
				) : (
					<CardStyle2 className="w-full max-w-3xl">
						<div className="flex w-full flex-col gap-8">
							<div className="text-center">
								<h3 className="font-pirulen text-xl tracking-widest text-white">Tournament Lobby</h3>
								<p className="mt-2 text-sm text-gray-400">{tournament?.name || tournamentName}</p>
							</div>
							{isLoadingTournament && (
								<div className="flex flex-col items-center gap-3 text-gray-400">
									<div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
									<span className="font-mono text-xs tracking-widest">LOADING TOURNAMENT</span>
								</div>
							)}
							{loadError && (
								<div className="rounded-sm border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-300">
									<p className="font-pirulen text-xs tracking-widest text-red-300">Unable to load tournament</p>
									<p className="mt-2 text-xs text-gray-400">{loadError}</p>
									<div className="mt-4 flex justify-center">
										<ButtonStyle3 onClick={handleRetryLoad}>Retry</ButtonStyle3>
									</div>
								</div>
							)}
							{tournament && (
								<div className="flex flex-col gap-6">
									<div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-300">
										<span className="rounded-sm border border-white/10 bg-white/5 px-3 py-1">ID: {tournament.id}</span>
										<span className="rounded-sm border border-white/10 bg-white/5 px-3 py-1">
											Visibility: {tournament.visibility === 'PUBLIC' ? 'Public' : 'Private'}
										</span>
										<span className="rounded-sm border border-white/10 bg-white/5 px-3 py-1">Status: {tournament.status}</span>
										<span className="rounded-sm border border-white/10 bg-white/5 px-3 py-1">
											Players: {tournament.participants.length}/{tournament.size}
										</span>
									</div>
									<div className="rounded-sm border border-white/10 bg-white/5 p-4">
										<h4 className="font-pirulen text-xs tracking-widest text-white">Players</h4>
										{tournament.participants.length > 0 ? (
											<ul className="mt-3 flex flex-col gap-2 text-sm text-gray-200">
												{tournament.participants.map((participant) => (
													<li key={participant.id} className="flex items-center justify-between">
														<span>{participant.displayName}</span>
														<span className="text-xs text-gray-500">{participant.type}</span>
													</li>
												))}
											</ul>
										) : (
											<p className="mt-3 text-xs text-gray-400">No players yet. Share the tournament ID to invite.</p>
										)}
									</div>
								</div>
							)}
							<div className="mt-2 flex flex-col items-center gap-2">
								<ButtonStyle3 onClick={handleCreateAnother}>Create another</ButtonStyle3>
								<Link
									to="/play"
									className="text-center font-pirulen text-xs font-bold tracking-widest text-gray-400 hover:text-neon-blue"
								>
									Return
								</Link>
							</div>
						</div>
					</CardStyle2>
				)}
			</div>
		</div>
	);
}
