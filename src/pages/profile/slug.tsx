import { createElement, useState, useEffect, useCallback } from 'my-react';
import { Link, useParams, useNavigate } from 'my-react-router';
import { useToast } from '../../hook/useToast';
import { ButtonStyle3 } from '../../components/ui/button/style3';
import { ButtonStyle4 } from '../../components/ui/button/style4';
import { fetchJsonWithAuth } from '../../libs/fetchWithAuth';

interface UserProfile {
	id: string;
	username: string;
	avatarUrl: string | null;
	bio: string | null;
	createdAt: string;
	stats: {
		wins: number;
		losses: number;
		totalGames: number;
		winRate: number;
		rank: number;
		elo: number;
	};
	isOnline: boolean;
	isFriend: boolean;
	hasPendingRequest: boolean;
}

export function ProfileSlugPage() {
	const params = useParams();
	const navigate = useNavigate();
	const { toast } = useToast();
	const username = params.slug;

	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isSendingRequest, setIsSendingRequest] = useState(false);

	const loadProfile = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		const result = await fetchJsonWithAuth<UserProfile>(`/api/user/profile/${username}`);

		if (result.ok && result.data) {
			setProfile(result.data);
		} else {
			setError(result.error || 'Utilisateur non trouvé');
		}
		setIsLoading(false);
	}, [username]);

	useEffect(() => {
		if (!username) {
			navigate('/');
			return;
		}

		loadProfile();
	}, [username, navigate, loadProfile]);

	const handleAddFriend = async () => {
		if (!profile) return;

		setIsSendingRequest(true);
		const result = await fetchJsonWithAuth('/api/social/friend-request', {
			method: 'POST',
			body: JSON.stringify({ username: profile.username }),
		});

		if (result.ok) {
			toast('Demande d\'ami envoyée', 'success');
			setProfile({ ...profile, hasPendingRequest: true });
		} else {
			toast(result.error || 'Erreur lors de l\'envoi', 'error');
		}
		setIsSendingRequest(false);
	};

	const handleRemoveFriend = async () => {
		if (!profile) return;

		const result = await fetchJsonWithAuth(`/api/social/friend/${profile.id}`, {
			method: 'DELETE',
		});

		if (result.ok) {
			toast('Ami supprimé', 'success');
			setProfile({ ...profile, isFriend: false });
		} else {
			toast(result.error || 'Erreur lors de la suppression', 'error');
		}
	};

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
					<span className="font-pirulen text-xs tracking-widest text-gray-400">CHARGEMENT...</span>
				</div>
			</div>
		);
	}

	if (error || !profile) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="flex flex-col items-center gap-6 text-center">
					<div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-red-500/50 bg-red-500/10">
						<span className="text-4xl">?</span>
					</div>
					<div>
						<h2 className="font-pirulen text-xl tracking-widest text-white">UTILISATEUR NON TROUVÉ</h2>
						<p className="mt-2 text-sm text-gray-400">{error || `L'utilisateur "${username}" n'existe pas.`}</p>
					</div>
					<Link to="/">
						<ButtonStyle3>Retour à l'accueil</ButtonStyle3>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full overflow-y-auto p-6 text-white">
			<div className="mx-auto max-w-4xl">
				{/* Header with back button */}
				<div className="mb-8 flex items-center gap-4">
					<button
						onClick={() => window.history.back()}
						className="text-gray-400 transition-colors hover:text-white"
					>
						← Retour
					</button>
				</div>

				{/* Profile Header */}
				<div className="mb-8 rounded-lg border border-cyan-500/30 bg-slate-900/50 p-8">
					<div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
						{/* Avatar */}
						<div className="relative">
							<div className="h-32 w-32 overflow-hidden rounded-full border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
								{profile.avatarUrl ? (
									<img src={profile.avatarUrl} alt={profile.username} className="h-full w-full object-cover" />
								) : (
									<div className="flex h-full w-full items-center justify-center bg-slate-800 text-4xl text-cyan-400">
										{profile.username[0].toUpperCase()}
									</div>
								)}
							</div>
							{/* Online indicator */}
							<div
								className={`absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-slate-900 ${
									profile.isOnline
										? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
										: 'bg-gray-600'
								}`}
							/>
						</div>

						{/* Info */}
						<div className="flex-1 text-center md:text-left">
							<div className="flex flex-col items-center gap-2 md:flex-row md:items-center md:gap-4">
								<h1 className="font-pirulen text-2xl tracking-widest">{profile.username}</h1>
								<span
									className={`rounded-full px-3 py-1 text-xs ${
										profile.isOnline
											? 'bg-green-500/20 text-green-400'
											: 'bg-gray-500/20 text-gray-400'
									}`}
								>
									{profile.isOnline ? 'En ligne' : 'Hors ligne'}
								</span>
							</div>
							{profile.bio && (
								<p className="mt-4 text-sm text-gray-400">{profile.bio}</p>
							)}
							<p className="mt-2 text-xs text-gray-600">
								Membre depuis {new Date(profile.createdAt).toLocaleDateString('fr-FR', {
									year: 'numeric',
									month: 'long',
								})}
							</p>

							{/* Action buttons */}
							<div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
								{profile.isFriend ? (
									<ButtonStyle3 onClick={() => { handleRemoveFriend(); }}>Supprimer des amis</ButtonStyle3>
								) : profile.hasPendingRequest ? (
									<button
										disabled
										className="cursor-not-allowed rounded-sm border border-yellow-500/50 bg-yellow-500/10 px-6 py-2 text-xs text-yellow-400"
									>
										Demande envoyée
									</button>
								) : (
									<ButtonStyle4 onClick={() => { handleAddFriend(); }} disabled={isSendingRequest}>
										{isSendingRequest ? 'Envoi...' : 'Ajouter en ami'}
									</ButtonStyle4>
								)}
								<Link to={`/statistics/general/${profile.username}`}>
									<ButtonStyle3>Voir statistiques</ButtonStyle3>
								</Link>
							</div>
						</div>
					</div>
				</div>

				{/* Stats Grid */}
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
					{/* Wins */}
					<div className="rounded-lg border border-green-500/30 bg-slate-900/50 p-6 text-center">
						<h3 className="font-pirulen text-xs tracking-wider text-green-500">VICTOIRES</h3>
						<p className="mt-2 text-4xl font-bold text-green-400">{profile.stats.wins}</p>
					</div>

					{/* Losses */}
					<div className="rounded-lg border border-red-500/30 bg-slate-900/50 p-6 text-center">
						<h3 className="font-pirulen text-xs tracking-wider text-red-500">DÉFAITES</h3>
						<p className="mt-2 text-4xl font-bold text-red-400">{profile.stats.losses}</p>
					</div>

					{/* Win Rate */}
					<div className="rounded-lg border border-cyan-500/30 bg-slate-900/50 p-6 text-center">
						<h3 className="font-pirulen text-xs tracking-wider text-cyan-500">TAUX VICTOIRE</h3>
						<p className="mt-2 text-4xl font-bold text-cyan-400">{profile.stats.winRate}%</p>
					</div>

					{/* ELO */}
					<div className="rounded-lg border border-purple-500/30 bg-slate-900/50 p-6 text-center">
						<h3 className="font-pirulen text-xs tracking-wider text-purple-500">ELO</h3>
						<p className="mt-2 text-4xl font-bold text-purple-400">{profile.stats.elo}</p>
					</div>
				</div>

				{/* Detailed Stats */}
				<div className="mt-6 rounded-lg border border-cyan-500/30 bg-slate-900/50 p-6">
					<h2 className="font-pirulen mb-6 text-xs tracking-wider text-cyan-500">STATISTIQUES DÉTAILLÉES</h2>
					
					<div className="space-y-4">
						{/* Total Games */}
						<div className="flex items-center justify-between">
							<span className="text-gray-400">Total de parties</span>
							<span className="font-bold text-white">{profile.stats.totalGames}</span>
						</div>

						{/* Rank */}
						<div className="flex items-center justify-between">
							<span className="text-gray-400">Classement mondial</span>
							<span className="font-bold text-yellow-400">#{profile.stats.rank}</span>
						</div>

						{/* Win Rate Bar */}
						<div className="pt-4">
							<div className="mb-2 flex justify-between text-xs">
								<span className="text-green-400">Victoires ({profile.stats.wins})</span>
								<span className="text-red-400">Défaites ({profile.stats.losses})</span>
							</div>
							<div className="flex h-4 overflow-hidden rounded-full bg-slate-700">
								<div
									className="bg-linear-to-r from-green-500 to-green-400 transition-all duration-500"
									style={`width: ${profile.stats.winRate}%`}
								/>
								<div
									className="bg-linear-to-r from-red-400 to-red-500 transition-all duration-500"
									style={`width: ${100 - profile.stats.winRate}%`}
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Recent Activity Placeholder */}
				<div className="mt-6 rounded-lg border border-orange-500/30 bg-slate-900/50 p-6">
					<h2 className="font-pirulen mb-4 text-xs tracking-wider text-orange-500">ACTIVITÉ RÉCENTE</h2>
					<div className="space-y-3">
						{profile.stats.totalGames > 0 ? (
							<p className="text-center text-sm text-gray-400">
								<Link
									to={`/statistics/historic/${profile.username}`}
									className="text-orange-400 transition-colors hover:text-white"
								>
									Voir l'historique des parties →
								</Link>
							</p>
						) : (
							<p className="text-center text-sm text-gray-500">Aucune partie jouée pour le moment.</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
