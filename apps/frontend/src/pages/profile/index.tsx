import { createElement, useState, useEffect, useCallback } from 'my-react';
import { Link, useNavigate } from 'my-react-router';
import { useAuth } from '../../hook/useAuth';
import { useToast } from '../../hook/useToast';
import { fetchJsonWithAuth, fetchWithAuth } from '../../libs/fetchWithAuth';
import { useValidation } from '../../hook/useValidation';
import { ProfileSchema } from '@/dto/updateProfile.dto';
import {
	AvatarCard,
	QuickStatsCard,
	UserInfoCard,
	BioCard,
	AccountSettingsCard,
	TwoFactorCard,
	DangerZoneCard,
	TwoFASetupModal,
	DeleteAccountModal,
	UserStats,
	ProfileData,
	TwoFactorSetupResponse,
} from '@/components/profile';

export function ProfilePage() {
	const { user, checkAuth } = useAuth();
	const { toast } = useToast();
	const navigate = useNavigate();

	// DTO Validation
	const { validate: validateProfile, getFieldError } = useValidation(ProfileSchema);

	// Avatar state
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
	const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);
	const [selfHosted, setSelfHosted] = useState(false);

	// Bio state
	const [bio, setBio] = useState('');
	const [isSavingBio, setIsSavingBio] = useState(false);

	// Memoized bio change handler
	const handleBioChange = useCallback((newBio: string) => {
		setBio(newBio);
	}, []);

	// Stats state
	const [stats, setStats] = useState<UserStats | null>(null);

	// 2FA state
	const [show2FAModal, setShow2FAModal] = useState(false);
	const [qrCodeUrl, setQrCodeUrl] = useState('');
	const [secret, setSecret] = useState('');
	const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);

	// Delete account state
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	// Check if user registered with email (not OAuth)
	const isEmailProvider = true;

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

			const [result, result2] = await Promise.all([resultPromise, result2Promise]);

		if (result.ok && result2.ok && result.data && result2.data) {
			setAvatarPreview(result.data.avatar);
			setBio(result.data.bio || '');
			setSelfHosted(result.data.selfHosted);
			setStats(result2.data);
		}
		};

		fetchProfile();
	}, [user?.id]);

	// Avatar handler
	const handleAvatarChange = useCallback(async (e: Event) => {
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
			setSelfHosted(true);
		} else {
			const errorData = await response.json().catch(() => ({}));
			toast(errorData.message || errorData.error || 'Error while downloading', 'error');
			setAvatarPreview(null);
		}
		setIsUploadingAvatar(false);
	}, [toast]);

	// Delete avatar handler
	const handleDeleteAvatar = useCallback(async () => {
		setIsDeletingAvatar(true);

		const result = await fetchJsonWithAuth<{ message: string; avatarUrl: string | null }>('/api/user/avatar', {
			method: 'DELETE',
			body: JSON.stringify({}),
		});

		if (result.ok && result.data) {
			toast('Avatar deleted', 'success');
			setAvatarPreview(result.data.avatarUrl);
			setSelfHosted(false);
		} else {
			toast(result.error || 'Error during deletion', 'error');
		}
		setIsDeletingAvatar(false);
	}, [toast]);

	// Bio handler
	const handleSaveBio = useCallback(async () => {
		setIsSavingBio(true);

		const validation = validateProfile({ bio });
		if (!validation.valid && validation.errors) {
			toast(getFieldError(validation.errors, 'bio') || 'Invalid bio!', 'error', 1000);
			setIsSavingBio(false);
			return;
		}

		const result = await fetchJsonWithAuth('/api/user/bio', {
			method: 'PUT',
			body: JSON.stringify({ bio }),
		});

		if (result.ok) {
			toast('Bio updated', 'success');
		} else {
			toast(result.error || 'Error during backup', 'error');
		}
		setIsSavingBio(false);
	}, [bio, validateProfile, getFieldError, toast]);

	// Username handler
	const handleUpdateUsername = useCallback(async (newUsername: string) => {
		const usernameValue = newUsername.trim();

		const validation = validateProfile({ username: usernameValue });
		if (!validation.valid && validation.errors) {
			toast(getFieldError(validation.errors, 'username') || 'Username not valid!', 'error', 1000);
			return;
		}

		const result = await fetchJsonWithAuth('/api/auth/username', {
			method: 'PATCH',
			body: JSON.stringify({ username: usernameValue }),
		});

		if (result.ok) {
			toast('Username updated', 'success');
			await checkAuth();
		} else {
			toast(result.error || 'Error during update', 'error');
		}
	}, [validateProfile, getFieldError, toast, checkAuth]);

	// Email handler
	const handleUpdateEmail = useCallback(async (newEmail: string) => {
		const validation = validateProfile({ mail: newEmail });
		if (!validation.valid && validation.errors) {
			toast(getFieldError(validation.errors, 'mail') || 'Invalid mail!', 'error', 1000);
			return;
		}

		const result = await fetchJsonWithAuth('/api/auth/email', {
			method: 'PATCH',
			body: JSON.stringify({ email: newEmail }),
		});

		if (result.ok) {
			toast('Email updated', 'success');
		} else {
			toast(result.error || 'Error during update', 'error');
		}
	}, [validateProfile, getFieldError, toast]);

	// Password handler
	const handleUpdatePassword = useCallback(async (currentPassword: string, newPassword: string) => {
		const validation = validateProfile({ password: newPassword });
		if (!validation.valid && validation.errors) {
			toast(getFieldError(validation.errors, 'password') || 'Invalid password!', 'error', 1000);
			return;
		}

		// faire politique de mot de passe
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
		} else {
			toast(result.error || 'Error during update', 'error');
		}
	}, [validateProfile, getFieldError, toast]);

	// 2FA handlers
	const handleSetup2FA = useCallback(async () => {
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
	}, [toast]);

	const handleVerify2FA = useCallback(async (totpCode: string) => {
		const validation = validateProfile({ totpCode });
		if (!validation.valid && validation.errors) {
			toast(getFieldError(validation.errors, 'totpCode') || 'Invalid totpCode!', 'error', 1000);
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
			setSecret('');
			setQrCodeUrl('');
		} else {
			toast(result.error || 'Invalid code', 'error');
		}
	}, [validateProfile, getFieldError, toast, checkAuth]);

	const handleDisable2FA = useCallback(async () => {
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
	}, [toast, checkAuth]);

	// Delete account handler
	const handleDeleteAccount = useCallback(async () => {
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
	}, [toast]);

	// Memoized callback for opening delete modal
	const handleOpenDeleteModal = useCallback(() => {
		setShowDeleteModal(true);
	}, []);

	// Memoized callback for closing modals
	const handleClose2FAModal = useCallback(() => {
		setShow2FAModal(false);
	}, []);

	const handleCloseDeleteModal = useCallback(() => {
		setShowDeleteModal(false);
	}, []);

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
					<AvatarCard
						avatarPreview={avatarPreview}
						username={user?.username}
						onAvatarChange={handleAvatarChange}
						isUploading={isUploadingAvatar}
						onAvatarDelete={handleDeleteAvatar}
						isDeletingAvatar={isDeletingAvatar}
						canDeleteAvatar={selfHosted}
					/>
						<QuickStatsCard stats={stats} />
					</div>

					{/* Right Column - Details & Settings */}
					<div className="space-y-6 lg:col-span-2">
						<UserInfoCard user={user} onUsernameUpdate={handleUpdateUsername} />
						<BioCard bio={bio} onBioChange={handleBioChange} onSaveBio={handleSaveBio} isSaving={isSavingBio} />
						{isEmailProvider && (
							<AccountSettingsCard
								user={user}
								onEmailUpdate={handleUpdateEmail}
								onPasswordUpdate={handleUpdatePassword}
							/>
						)}
						<TwoFactorCard
							user={user}
							onSetup2FA={handleSetup2FA}
							onDisable2FA={handleDisable2FA}
							isSettingUp={isSettingUp2FA}
						/>
						<DangerZoneCard onDeleteClick={handleOpenDeleteModal} />
					</div>
				</div>
			</div>

			{/* 2FA Setup Modal */}
			{show2FAModal && (
				<TwoFASetupModal
					onClose={handleClose2FAModal}
					qrCodeUrl={qrCodeUrl}
					secret={secret}
					onVerify={handleVerify2FA}
				/>
			)}

			{/* Delete Account Modal */}
			{showDeleteModal && (
				<DeleteAccountModal
					onClose={handleCloseDeleteModal}
					onConfirmDelete={handleDeleteAccount}
					isDeleting={isDeleting}
				/>
			)}
		</div>
	);
}
