import { createElement, useState, useEffect } from 'my-react';
import { Link, useParams, useNavigate } from 'my-react-router';
import { useToast } from '../../hook/useToast';
import { ButtonStyle3 } from '../../components/ui/button/style3';
import { ButtonStyle4 } from '../../components/ui/button/style4';
import { fetchJsonWithAuth } from '../../libs/fetchWithAuth';
import { ButtonStyle2 } from '@/components/ui/button/style2';
import { useAuth } from '@/hook/useAuth';
import { useFriends } from '@/hook/useFriends';

interface UserIdentity {
	id: number;
	username: string;
}

interface ProfileData {
	id: number;
	username: string;
	avatar: string | null;
	bio: string;
}

interface StatsData {
	elo: number;
	total_games: number;
	wins: number;
	losses: number;
	winrate: number | null;
}

interface UserProfile {
	id: number;
	username: string;
	avatarUrl: string | null;
	bio: string | null;
	isMe: boolean;
	stats: StatsData;
	isFriend: boolean;
	hasPendingRequest: boolean;
}

export function ProfileSlugPage() {
	const params = useParams();
	const navigate = useNavigate();
	const { toast } = useToast();
	const { user } = useAuth();
	const { sendFriendInvite, friends, pendingInvitations, removeFriend } = useFriends();
	const username = params.slug;

	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!username) {
			navigate('/');
			return;
		}

		const loadProfile = async () => {
			setIsLoading(true);
			setError(null);

			try {
				// 1. Fetch Profile by Username (no need to resolve ID separately anymore)
				const profileResult = await fetchJsonWithAuth<ProfileData>(`/api/user/profile/${username}`);

				if (!profileResult.ok || !profileResult.data) {
					setError('Utilisateur non trouvé');
					setIsLoading(false);
					return;
				}

				const profileData = profileResult.data;
				const userId = profileData.id;

				// 2. Fetch Stats using the ID from the profile response
				const statsResult = await fetchJsonWithAuth<StatsData>(`/api/stats/user/small/${userId}`);

				if (statsResult.ok && statsResult.data) {
					setProfile({
						id: userId,
						username: profileData.username,
						avatarUrl: profileData.avatar,
						bio: profileData.bio,
						isMe: user?.id === userId,
						stats: statsResult.data,
						isFriend: friends.some((friend) => friend.id === userId) ? true : false,
						hasPendingRequest: pendingInvitations.some((invitation) => invitation.senderId === userId) ? true : false,
					});
				} else {
					// Fallback if stats fail
					setProfile({
						id: userId,
						username: profileData.username,
						avatarUrl: profileData.avatar,
						bio: profileData.bio,
						isMe: user?.id === userId,
						stats: {
							elo: 1000,
							total_games: 0,
							wins: 0,
							losses: 0,
							winrate: null,
						},
						isFriend: friends.some((friend) => friend.id === userId) ? true : false,
						hasPendingRequest: pendingInvitations.some((invitation) => invitation.senderId === userId) ? true : false,
					});
				}
			} catch (err) {
				setError('Une erreur est survenue');
				console.error(err);
			}

			setIsLoading(false);
		};

		loadProfile();

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [username, friends, pendingInvitations]);

	// useEffect(() => {
	// 	console.log(user, profile);
	// }, [profile]);

	const handleAddFriend = async () => {
		if (!profile) return;
		console.log('add friend', profile.id);
		sendFriendInvite(profile.id);
	};

	const handleRemoveFriend = async () => {
		if (!profile) return;
		removeFriend(profile.id);
	};

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
					<span className="font-pirulen text-xs tracking-widest text-gray-400">LOADING...</span>
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
						<h2 className="font-pirulen text-xl tracking-widest text-white">USER NOT FOUND</h2>
						<p className="mt-2 text-sm text-gray-400">{error || `User "${username}" not found.`}</p>
					</div>
					<Link to="/">
						<ButtonStyle3>Return to homepage</ButtonStyle3>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="h-full overflow-y-auto p-6 text-white">
			<div className="mx-auto max-w-4xl">
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
						</div>

						{/* Info */}
						<div className="flex-1 text-center md:text-left">
							<div className="flex flex-col items-center gap-2 md:flex-row md:items-center md:gap-4">
								<h1 className="font-pirulen text-2xl tracking-widest">{profile.username}</h1>
							</div>
							{profile.bio && <p className="mt-4 text-sm text-gray-400">{profile.bio}</p>}

							{/* Action buttons */}
							{!profile.isMe && (
								<div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
									{profile.isFriend ? (
										<ButtonStyle3
											onClick={() => {
												handleRemoveFriend();
											}}
										>
											Delete from friends
										</ButtonStyle3>
									) : profile.hasPendingRequest ? (
										<button
											disabled
											className="cursor-not-allowed rounded-sm border border-yellow-500/50 bg-yellow-500/10 px-6 py-2 text-xs text-yellow-400"
										>
											Invitation send
										</button>
									) : (
										<ButtonStyle4
											onClick={() => {
												handleAddFriend();
											}}
											disabled={profile.hasPendingRequest}
										>
											{profile.hasPendingRequest ? 'Sending...' : 'Add friend'}
										</ButtonStyle4>
									)}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Stats Grid */}
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
					{/* Wins */}
					<div className="rounded-lg border border-green-500/30 bg-slate-900/50 p-6 text-center">
						<h3 className="font-pirulen text-xs tracking-wider text-green-500">VICTORIES</h3>
						<p className="mt-2 text-4xl font-bold text-green-400">{profile.stats.wins}</p>
					</div>

					{/* Losses */}
					<div className="rounded-lg border border-red-500/30 bg-slate-900/50 p-6 text-center">
						<h3 className="font-pirulen text-xs tracking-wider text-red-500">DEFEATS</h3>
						<p className="mt-2 text-4xl font-bold text-red-400">{profile.stats.losses}</p>
					</div>

					{/* Win Rate */}
					<div className="rounded-lg border border-cyan-500/30 bg-slate-900/50 p-6 text-center">
						<h3 className="font-pirulen text-xs tracking-wider text-cyan-500">WINRATE</h3>
						<p className="mt-2 text-4xl font-bold text-cyan-400">{profile.stats.winrate?.toFixed(2) ?? 'N/A'}%</p>
					</div>

					{/* ELO */}
					<div className="rounded-lg border border-purple-500/30 bg-slate-900/50 p-6 text-center">
						<h3 className="font-pirulen text-xs tracking-wider text-purple-500">ELO</h3>
						<p className="mt-2 text-4xl font-bold text-purple-400">{profile.stats.elo}</p>
					</div>
				</div>

				<div className="mt-6 flex justify-center">
					<Link to={`/statistics/general/${params.slug}`}>
						<ButtonStyle2 className="bg-purple-500/50">View statistics</ButtonStyle2>
					</Link>
				</div>
			</div>
		</div>
	);
}
