import { createElement, useState, useRef, useEffect } from 'my-react';
import { Link, useNavigate } from 'my-react-router';
import { useAuth } from '../../hook/useAuth';
import { useToast } from '../../hook/useToast';
import { ButtonStyle3 } from '../../components/ui/button/style3';
import { ButtonStyle4 } from '../../components/ui/button/style4';
import { Modal } from '../../components/ui/modal';
import { fetchJsonWithAuth, fetchWithAuth } from '../../libs/fetchWithAuth';
import { ButtonStyle2 } from '@/components/ui/button/style2';

interface UserStats {
	wins: number;
	losses: number;
	total_games: number;
	winrate: number;
}

interface ProfileData {
	username: string;
	avatar: string | null;
	bio: string;
}

interface TwoFactorSetupResponse {
	success: boolean;
	link: string;
	secret: string;
}

export function ProfilePage() {
	const { user, checkAuth } = useAuth();
	const { toast } = useToast();
	const navigate = useNavigate();
	
	// Avatar state
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	// Bio state
	const [bio, setBio] = useState('');
	const [isEditingBio, setIsEditingBio] = useState(false);
	const [isSavingBio, setIsSavingBio] = useState(false);

	// Username state
	const [isEditingUsername, setIsEditingUsername] = useState(false);
	const [newUsername, setNewUsername] = useState('');


	// Email/Password state (only if provider is email)
	const [isEditingEmail, setIsEditingEmail] = useState(false);
	const [newEmail, setNewEmail] = useState('');
	const [isEditingPassword, setIsEditingPassword] = useState(false);
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [stats, setStats] = useState<UserStats | null>(null);

	// 2FA state
	const [show2FAModal, setShow2FAModal] = useState(false);
	const [qrCodeUrl, setQrCodeUrl] = useState('');
	const [secret, setSecret] = useState('');
	const [totpCode, setTotpCode] = useState('');
	const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);

	// Delete account state
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [deleteConfirmText, setDeleteConfirmText] = useState('');
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		if (user?.isGuest) {
			toast('Please have an account to use all features', 'error');
			navigate('/play');
		}
	}, [user?.isGuest]);
	// Fetch profile data
	useEffect(() => {
		const fetchProfile = async () => {
			if (!user?.id) return;

			const resultPromise = fetchJsonWithAuth<ProfileData>(`/api/user/profile/${user.id}`);
			const result2Promise = fetchJsonWithAuth<UserStats>(`/api/stats/user/small/${user.id}`);
			// /user/small/:userId

			const [result, result2] = await Promise.all([resultPromise, result2Promise]);

			if (result.ok && result2.ok && result.data && result2.data) {
				setAvatarPreview(result.data.avatar);
				setBio(result.data.bio || '');
				setStats(result2.data);
			}
		};

		fetchProfile();
	}, [user?.id]);

	// Stats (mock data for now)
	// const stats: UserStats = {
	// 	wins: 42,
	// 	losses: 18,
	// 	totalGames: 60,
	// 	winRate: 70,
	// };

	// Check if user registered with email (not OAuth)
	const isEmailProvider = true;

	// Avatar handlers
	const handleAvatarClick = () => {
		fileInputRef.current?.click();
	};

	const handleAvatarChange = async (e: Event) => {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		// Preview
		const reader = new FileReader();
		reader.onload = (event) => {
			setAvatarPreview(event.target?.result as string);
		};
		reader.readAsDataURL(file);

		// Upload
		setIsUploadingAvatar(true);
		const formData = new FormData();
		formData.append('avatar', file);

		const response = await fetchWithAuth('/api/user/avatar', {
			method: 'POST',
			body: formData,
		});

		if (response.ok) {
			toast('Avatar updated', 'success');
		} else {
			const errorData = await response.json().catch(() => ({}));
			toast(errorData.message || errorData.error || 'Error while downloading', 'error');
			setAvatarPreview(null);
		}
		setIsUploadingAvatar(false);
	};

	// Bio handlers
	const handleSaveBio = async () => {
		setIsSavingBio(true);
		const result = await fetchJsonWithAuth('/api/user/bio', {
			method: 'PUT',
			body: JSON.stringify({ bio }),
		});

		if (result.ok) {
			toast('Bio updated', 'success');
			setIsEditingBio(false);
		} else {
			toast(result.error || 'Error during backup', 'error');
		}
		setIsSavingBio(false);
	};

	// Username handler
	const handleUpdateUsername = async () => {
		const usernameValue = newUsername.trim();

		if (usernameValue === '') {
			toast('Username cannot be empty', 'warning');
			return;
		}

		if (!usernameValue || usernameValue.length < 3) {
			toast('Username must be at least 3 characters long', 'warning');
			return;
		}
		if (usernameValue.length > 20) {
			toast('Username must be at most 20 characters long', 'warning');
			return;
		}

		const result = await fetchJsonWithAuth('/api/auth/username', {
			method: 'PATCH',
			body: JSON.stringify({ username: usernameValue }),
		});

		if (result.ok) {
			toast('Username updated', 'success');
			setIsEditingUsername(false);
			setNewUsername('');
			await checkAuth();
		} else {
			toast(result.error || 'Error during update', 'error');
		}
	};

	// Email handler
	const handleUpdateEmail = async () => {
		if (!newEmail) {
			toast('Please enter an email', 'warning');
			return;
		}

		const result = await fetchJsonWithAuth('/api/auth/email', {
			method: 'PATCH',
			body: JSON.stringify({ email: newEmail }),
		});

		if (result.ok) {
			toast('Email updated', 'success');
			setIsEditingEmail(false);
			setNewEmail('');
		} else {
			toast(result.error || 'Error during update', 'error');
		}
	};

	// Password handler
	const handleUpdatePassword = async () => {
		if (newPassword !== confirmPassword) {
			toast('The passwords do not match', 'error');
			return;
		}
		if (newPassword.length < 8) {
			toast('The password must be at least 8 characters long.', 'warning');
			return;
		}

		const result = await fetchJsonWithAuth('/api/auth/password', {
			method: 'PATCH',
			body: JSON.stringify({
				currentPassword,
				newPassword,
			}),
		});

		if (result.ok) {
			toast('Password updated', 'success');
			setIsEditingPassword(false);
			setCurrentPassword('');
			setNewPassword('');
			setConfirmPassword('');
		} else {
			toast(result.error || 'Error during update', 'error');
		}
	};

	// 2FA handlers
	const handleSetup2FA = async () => {
		setIsSettingUp2FA(true);
		const result = await fetchJsonWithAuth<TwoFactorSetupResponse>('/api/auth/2fa/enable', {
			method: 'POST',
			body: JSON.stringify({}),
		});

		if (result.ok && result.data) {
			setQrCodeUrl(result.data.link);
			setSecret(result.data.secret);
			setShow2FAModal(true);
		} else {
			toast(result.error || 'Error during 2FA setup', 'error');
		}
		setIsSettingUp2FA(false);
	};

	const handleVerify2FA = async () => {
		if (totpCode.length !== 6) {
			toast('The code must contain 6 digits', 'warning');
			return;
		}

		const result = await fetchJsonWithAuth('/api/auth/2fa/verify-setup', {
			method: 'POST',
			body: JSON.stringify({ code: totpCode }),
		});

		if (result.ok) {
			toast('2FA activated successfully', 'success');
			await checkAuth();
			setShow2FAModal(false);
			setTotpCode('');
			setSecret('');
			setQrCodeUrl('');
		} else {
			toast(result.error || 'Invalid code', 'error');
		}
	};

	const handleDisable2FA = async () => {
		const result = await fetchJsonWithAuth('/api/auth/2fa', {
			method: 'DELETE',
			body: JSON.stringify({}),
		});

		if (result.ok) {
			toast('2FA disabled', 'success');
			await checkAuth();
		} else {
			toast(result.error || 'Error during deactivation', 'error');
		}
	};

	// Delete account handler
	const handleDeleteAccount = async () => {
		if (deleteConfirmText !== 'DELETE') {
			toast('Please type DELETE to confirm', 'warning');
			return;
		}

		setIsDeleting(true);
		const result = await fetchJsonWithAuth('/api/auth/account', {
			method: 'DELETE',
			body: JSON.stringify({}),
		});

		if (result.ok) {
			toast('Account deleted', 'success');
			window.location.href = '/';
		} else {
			toast(result.error || 'Error during deletion', 'error');
		}
		setIsDeleting(false);
	};

	return (
		<div className="h-full overflow-y-auto p-6 text-white">
			<div className="mx-auto max-w-4xl">
				{/* Header */}
				<div className="mb-8 flex items-center justify-between">
					<h1 className="font-pirulen text-3xl tracking-widest">MY PROFILE</h1>
					<Link
						to="/statistics/general"
						className="font-pirulen text-xs tracking-wider text-cyan-400 transition-colors hover:text-white"
					>
						VIEW STATISTICS →
					</Link>
				</div>

				<div className="grid gap-6 lg:grid-cols-3">
					{/* Left Column - Avatar & Quick Stats */}
					<div className="space-y-6">
						{/* Avatar Card */}
						<div className="rounded-lg border border-cyan-500/30 bg-slate-900/50 p-6">
							<h2 className="font-pirulen mb-4 text-xs tracking-wider text-cyan-500">AVATAR</h2>
							<div className="flex flex-col items-center gap-4">
								<div
									onClick={handleAvatarClick}
									className="group relative h-32 w-32 cursor-pointer overflow-hidden rounded-full border-2 border-cyan-500/50 transition-all duration-300 hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]"
								>
									{avatarPreview ? (
										<img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
									) : (
										<div className="flex h-full w-full items-center justify-center bg-slate-800 text-4xl text-cyan-400">
											{user?.username?.[0]?.toUpperCase() || '?'}
										</div>
									)}
									<div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
										<span className="font-pirulen text-xs text-white">MODIFY</span>
									</div>
									{isUploadingAvatar && (
										<div className="absolute inset-0 flex items-center justify-center bg-black/80">
											<div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
										</div>
									)}
								</div>
								<input
									ref={fileInputRef}
									type="file"
									accept="image/*"
									onChange={handleAvatarChange}
									className="hidden"
								/>
								<p className="text-center text-xs text-gray-500">Clic here for change</p>
							</div>
						</div>

						{/* Quick Stats Card */}
						<div className="rounded-lg border border-purple-500/30 bg-slate-900/50 p-6">
							<h2 className="font-pirulen mb-4 text-xs tracking-wider text-purple-500">STATISTICS</h2>
							<div className="space-y-3">
								<div className="flex justify-between">
									<span className="text-gray-400">Victories</span>
									<span className="font-bold text-green-400">{stats?.wins}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-400">Defeats</span>
									<span className="font-bold text-red-400">{stats?.losses}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-400">Total games</span>
									<span className="font-bold text-white">{stats?.total_games}</span>
								</div>
								{stats?.winrate ? (
								<div className="mt-4 border-t border-white/10 pt-4">
									<div className="flex justify-between">
										<span className="text-gray-400">Winrate</span>
										<span className="font-bold text-cyan-400">{stats.winrate.toFixed(2)}%</span>
									</div>
									<div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-700">
										<div
											className="h-full bg-linear-to-r from-cyan-500 to-purple-500 transition-all duration-500"
											style={`width: ${stats.winrate.toFixed(2)}%`}
										/>
									</div>
								</div>
								) : null}
							</div>
						</div>
						<div className="flex justify-center">
							<Link to="/statistics/general">
								<ButtonStyle2 className="bg-purple-500/50">View statistics</ButtonStyle2>
							</Link>
						</div>
					</div>

					{/* Right Column - Details & Settings */}
					<div className="space-y-6 lg:col-span-2">
						{/* User Info Card */}
						<div className="rounded-lg border border-cyan-500/30 bg-slate-900/50 p-6">
							<h2 className="font-pirulen mb-4 text-xs tracking-wider text-cyan-500">INFORMATIONS</h2>
							<div className="space-y-4">
								<div className="rounded-sm border border-white/10 p-4">
									<div className="flex items-center justify-between">
										<div>
											<label className="text-xs text-gray-500">Username</label>
											{/* <p className="text-lg font-bold text-white">{user?.username || 'Non défini'}</p> */}
										</div>
										{!isEditingUsername && (
											<button
												onClick={() => {
													setIsEditingUsername(true);
													setNewUsername(user?.username || '');
												}}
												className="text-xs text-cyan-400 transition-colors hover:text-white"
											>
												Modify
											</button>
										)}
									</div>
									{isEditingUsername ? (
										<div className="mt-2 space-y-3">
											<input
												type="text"
												value={newUsername}
												onInput={(e: Event) => setNewUsername((e.target as HTMLInputElement).value)}
												placeholder="New username"
												className="w-full rounded-sm border border-white/10 bg-transparent p-2 text-sm text-white outline-none focus:border-cyan-500/50"
												minLength={3}
												maxLength={20}
											/>
											<div className="flex justify-end gap-2">
												<ButtonStyle3 onClick={() => setIsEditingUsername(false)}>Cancel</ButtonStyle3>
												<ButtonStyle4 onClick={() => { handleUpdateUsername(); }}>Update</ButtonStyle4>
											</div>
										</div>
									) : (
										<p className="text-lg font-bold text-white">{user?.username || 'Non défini'}</p>
									)}
								</div>
								<div>
									<label className="text-xs text-gray-500">Mail</label>
									<p className="text-white">{user?.email || 'Non défini'}</p>
								</div>
							</div>
						</div>

						{/* Bio Card */}
						<div className="rounded-lg border border-orange-500/30 bg-slate-900/50 p-6">
							<div className="mb-4 flex items-center justify-between">
								<h2 className="font-pirulen text-xs tracking-wider text-orange-500">BIO</h2>
								{!isEditingBio && (
									<button
										onClick={() => setIsEditingBio(true)}
										className="text-xs text-gray-400 transition-colors hover:text-white"
									>
										Modify
									</button>
								)}
							</div>
							{isEditingBio ? (
								<div className="space-y-3">
									<textarea
										value={bio}
										onInput={(e: Event) => setBio((e.target as HTMLTextAreaElement).value)}
										placeholder="Describe yourself in a few words..."
										className="h-24 w-full resize-none rounded-sm border border-white/10 bg-transparent p-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-gray-600 focus:border-orange-500/50 focus:bg-white/5"
										maxLength={200}
									/>
									<div className="flex items-center justify-between">
										<span className="text-xs text-gray-500">{bio.length}/200</span>
								<div className="flex gap-2">
									<ButtonStyle3 onClick={() => setIsEditingBio(false)}>Cancel</ButtonStyle3>
									<ButtonStyle4 onClick={() => { handleSaveBio(); }} disabled={isSavingBio}>
												{isSavingBio ? 'Saving...' : 'Save'}
											</ButtonStyle4>
										</div>
									</div>
								</div>
							) : (
								<p className="text-sm text-gray-400">{bio || 'No bio defined. Click edit to add one.'}</p>
							)}
						</div>

						{/* Account Settings Card (only for email provider) */}
						{isEmailProvider && (
							<div className="rounded-lg border border-purple-500/30 bg-slate-900/50 p-6">
								<h2 className="font-pirulen mb-4 text-xs tracking-wider text-purple-500">ACCOUNT SETTINGS</h2>
								{(!user?.email || user?.email == '') && (
								<div className="mb-4 rounded-sm border border-red-500/30 bg-red-500/10 p-2">
									<p className="text-xs text-red-500">You cannot use this feature when you are connected via Discord or GitHub.</p>
								</div>
							)}
								<div className="space-y-4">
									{/* Email Section */}
									<div className="rounded-sm border border-white/10 p-4">
										<div className="flex items-center justify-between">
											<div>
												<h3 className="text-sm font-bold text-white">Mail</h3>
												<p className="text-xs text-gray-500">{user?.email}</p>
											</div>
											{!isEditingEmail && (
												<button
													onClick={() => setIsEditingEmail(true)}
													disabled={!user?.email || user?.email == ''}
													className="text-xs text-purple-400 transition-colors hover:text-white"
												>
													Modify
												</button>
											)}
										</div>
										{isEditingEmail && (
											<div className="mt-4 space-y-3">
												<input
													type="email"
													disabled={!user?.email || user?.email == ''}
													value={newEmail}
													onInput={(e: Event) => setNewEmail((e.target as HTMLInputElement).value)}
													placeholder="Nouvel email"
													className="w-full rounded-sm border border-white/10 bg-transparent p-2 text-sm text-white outline-none focus:border-purple-500/50"
												/>
												<div className="flex justify-end gap-2">
													<ButtonStyle3 disabled={!user?.email || user?.email == ''} onClick={() => setIsEditingEmail(false)}>Cancel</ButtonStyle3>
													<ButtonStyle4 disabled={!user?.email || user?.email == ''} onClick={() => { handleUpdateEmail(); }}>Update</ButtonStyle4>
												</div>
											</div>
										)}
									</div>

									{/* Password Section */}
									<div className="rounded-sm border border-white/10 p-4">
										<div className="flex items-center justify-between">
											<div>
												<h3 className="text-sm font-bold text-white">Password</h3>
												<p className="text-xs text-gray-500">••••••••</p>
											</div>
											{!isEditingPassword && (
												<button
													onClick={() => setIsEditingPassword(true)}
													disabled={!user?.email || user?.email == ''}
													className="text-xs text-purple-400 transition-colors hover:text-white"
												>
													Modify
												</button>
											)}
										</div>
										{isEditingPassword && (
											<div className="mt-4 space-y-3">
												<input
													type="password"
													disabled={!user?.email || user?.email == ''}
													value={currentPassword}
													onInput={(e: Event) => setCurrentPassword((e.target as HTMLInputElement).value)}
													placeholder="Current password"
													className="w-full rounded-sm border border-white/10 bg-transparent p-2 text-sm text-white outline-none focus:border-purple-500/50"
												/>
												<input
													type="password"
													disabled={!user?.email || user?.email == ''}
													value={newPassword}
													onInput={(e: Event) => setNewPassword((e.target as HTMLInputElement).value)}
													placeholder="New password"
													className="w-full rounded-sm border border-white/10 bg-transparent p-2 text-sm text-white outline-none focus:border-purple-500/50"
												/>
												<input
													type="password"
													disabled={!user?.email || user?.email == ''}
													value={confirmPassword}
													onInput={(e: Event) => setConfirmPassword((e.target as HTMLInputElement).value)}
													placeholder="Confirm the new password"
													className="w-full rounded-sm border border-white/10 bg-transparent p-2 text-sm text-white outline-none focus:border-purple-500/50"
												/>
												<div className="flex justify-end gap-2">
													<ButtonStyle3 disabled={!user?.email || user?.email == ''} onClick={() => setIsEditingPassword(false)}>Cancel</ButtonStyle3>
													<ButtonStyle4 disabled={!user?.email || user?.email == ''} onClick={() => { handleUpdatePassword(); }}>Update</ButtonStyle4>
												</div>
											</div>
										)}
									</div>
								</div>
							</div>
						)}

						{/* 2FA Card */}
						<div className="rounded-lg border border-green-500/30 bg-slate-900/50 p-6">
							<h2 className="font-pirulen mb-4 text-xs tracking-wider text-green-500">
								TWO-FACTOR AUTHENTICATION (2FA)
							</h2>
							{(!user?.email || user?.email == '') && (
								<div className="mb-4 rounded-sm border border-red-500/30 bg-red-500/10 p-2">
									<p className="text-xs text-red-500">You cannot use this feature when you are connected via Discord or GitHub.</p>
								</div>
							)}
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<div>
										<h3 className="text-sm font-bold text-white">TOTP Authenticator</h3>
										
										<p className="text-xs text-gray-500">
											{user?.twoFA
												? 'Activated - Your account is protected'
												: 'Disabled - Add an extra layer of security'}
										</p>
									</div>
									<div
										className={`h-3 w-3 rounded-full ${user?.twoFA ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-600'}`}
									/>
								</div>
								<div className="flex gap-2">
									{user?.twoFA ? (
										<ButtonStyle3 disabled={!user?.email || user?.email == ''} onClick={() => { handleDisable2FA(); }}>Disable 2FA</ButtonStyle3>
									) : (
										<ButtonStyle4 disabled={(!user?.email || user?.email == '') || isSettingUp2FA} onClick={() => { handleSetup2FA(); }} >
											{isSettingUp2FA ? 'Setting up...' : 'Enable 2FA'}
										</ButtonStyle4>
									)}
								</div>
							</div>
						</div>

						{/* Danger Zone */}
						<div className="rounded-lg border border-red-500/30 bg-slate-900/50 p-6">
							<h2 className="font-pirulen mb-4 text-xs tracking-wider text-red-500">DANGER ZONE</h2>
							<div className="flex items-center justify-between">
								<div>
									<h3 className="text-sm font-bold text-white">Delete my account</h3>
									<p className="text-xs text-gray-500">This action is irreversible</p>
								</div>
								<button
									onClick={() => setShowDeleteModal(true)}
									className="rounded-sm border border-red-500/50 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 transition-all duration-300 hover:bg-red-500/20 hover:text-red-300"
								>
									Delete
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* 2FA Setup Modal */}
			{show2FAModal && (
				<Modal onClose={() => setShow2FAModal(false)} title="2FA Setup" variant="cyan">
					<div className="space-y-4">
						<p className="text-sm text-gray-400">
							Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
						</p>
						{qrCodeUrl && (
							<div className="flex flex-col items-center gap-4">
								<div className="rounded-lg bg-white p-4">
									<img
									// voir pour generarer avec un canvas (plus secure)
										src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
										alt="QR Code 2FA"
										className="h-48 w-48"
									/>
								</div>

								{/* Secret manuel */}
								<div className="w-full space-y-2">
									<p className="text-xs text-gray-500">Or enter this code manually:</p>
									<div className="flex items-center gap-2 rounded-sm border border-white/10 bg-slate-800 p-3">
										<code className="flex-1 break-all font-mono text-sm text-cyan-400">{secret}</code>
										<button
											onClick={() => {
												navigator.clipboard.writeText(secret);
												toast('Copied!', 'success');
											}}
											className="text-xs text-gray-400 transition-colors hover:text-white"
										>
											Copy
										</button>
									</div>
								</div>
							</div>
						)}
						<div className="space-y-2">
							<label className="text-xs text-gray-500">Enter the 6-digit code</label>
							<input
								type="text"
								value={totpCode}
								onInput={(e: Event) => setTotpCode((e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6))}
								placeholder="000000"
								className="w-full rounded-sm border border-white/10 bg-transparent p-3 text-center text-2xl tracking-[0.5em] text-white outline-none focus:border-cyan-500/50"
								maxLength={6}
							/>
						</div>
						<ButtonStyle4 onClick={() => { handleVerify2FA(); }} className="w-full">
							Verify and enable
						</ButtonStyle4>
					</div>
				</Modal>
			)}

			{/* Delete Account Modal */}
			{showDeleteModal && (
				<Modal onClose={() => setShowDeleteModal(false)} title="Delete the account" variant="purple">
					<div className="space-y-4">
						<p className="text-sm text-red-400">
							Warning! This action will permanently delete your account and all your data.
						</p>
						<div className="space-y-2">
							<label className="text-xs text-gray-500">
								Tap <span className="font-bold text-white">DELETE</span> for confirmation
							</label>
							<input
								type="text"
								value={deleteConfirmText}
								onInput={(e: Event) => setDeleteConfirmText((e.target as HTMLInputElement).value)}
								placeholder="DELETE"
								className="w-full rounded-sm border border-red-500/30 bg-transparent p-3 text-center text-white outline-none focus:border-red-500"
							/>
						</div>
						<button
							onClick={handleDeleteAccount}
							disabled={deleteConfirmText !== 'DELETE' || isDeleting}
							className="w-full rounded-sm border border-red-500 bg-red-500/20 py-3 text-sm font-bold text-red-400 transition-all duration-300 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isDeleting ?'Deletion...': 'Permanently delete my account'}
						</button>
					</div>
				</Modal>
			)}
		</div>
	);
}
