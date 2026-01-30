import { User } from '@/context/authContext';

export interface UserStats {
	wins: number;
	losses: number;
	total_games: number;
	winrate: number;
}

export interface ProfileData {
	username: string;
	avatar: string | null;
	bio: string;
	selfHosted: boolean;
}

export interface TwoFactorSetupResponse {
	success: boolean;
	link: string;
	secret: string;
}

export interface AvatarCardProps {
	avatarPreview: string | null;
	username?: string;
	onAvatarChange: (e: Event) => void;
	isUploading: boolean;
	onAvatarDelete?: () => void;
	isDeletingAvatar?: boolean;
	canDeleteAvatar?: boolean;
}

export interface QuickStatsCardProps {
	stats: UserStats | null;
}

export interface UserInfoCardProps {
	user: User | null;
	onUsernameUpdate: (username: string) => Promise<void>;
}

export interface BioCardProps {
	bio: string;
	onBioChange: (bio: string) => void;
	onSaveBio: () => Promise<void>;
	isSaving: boolean;
}

export interface AccountSettingsCardProps {
	user: User | null;
	onEmailUpdate: (email: string) => Promise<void>;
	onPasswordUpdate: (currentPassword: string, newPassword: string) => Promise<void>;
}

export interface TwoFactorCardProps {
	user: User | null;
	onSetup2FA: () => Promise<void>;
	onDisable2FA: () => Promise<void>;
	isSettingUp: boolean;
}

export interface DangerZoneCardProps {
	onDeleteClick: () => void;
}

export interface TwoFASetupModalProps {
	onClose: () => void;
	qrCodeUrl: string;
	secret: string;
	onVerify: (code: string) => Promise<void>;
}

export interface DeleteAccountModalProps {
	onClose: () => void;
	onConfirmDelete: () => Promise<void>;
	isDeleting: boolean;
}

