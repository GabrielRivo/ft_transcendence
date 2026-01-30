import { createElement, useState } from 'my-react';
import { ButtonStyle3 } from '@/components/ui/button/style3';
import { ButtonStyle4 } from '@/components/ui/button/style4';
import { AccountSettingsCardProps } from './types';

export function AccountSettingsCard({ user, onEmailUpdate, onPasswordUpdate }: AccountSettingsCardProps) {
	// Email state
	const [isEditingEmail, setIsEditingEmail] = useState(false);
	const [newEmail, setNewEmail] = useState('');

	// Password state
	const [isEditingPassword, setIsEditingPassword] = useState(false);
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');

	const isDisabled = !user?.email || user?.email === '';

	const handleUpdateEmail = () => {
		onEmailUpdate(newEmail).then(() => {
			setIsEditingEmail(false);
			setNewEmail('');
		});
	};

	const handleUpdatePassword = () => {
		onPasswordUpdate(currentPassword, newPassword).then(() => {
			setIsEditingPassword(false);
			setCurrentPassword('');
			setNewPassword('');
			setConfirmPassword('');
		});
	};

	return (
		<div className="rounded-lg border border-purple-500/30 bg-slate-900/50 p-6">
			<h2 className="font-pirulen mb-4 text-xs tracking-wider text-purple-500">ACCOUNT SETTINGS</h2>
			{isDisabled && (
				<div className="mb-4 rounded-sm border border-red-500/30 bg-red-500/10 p-2">
					<p className="text-xs text-red-500">
						You cannot use this feature when you are connected via Discord or GitHub.
					</p>
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
								disabled={isDisabled}
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
								disabled={isDisabled}
								value={newEmail}
								onInput={(e: Event) => setNewEmail((e.target as HTMLInputElement).value)}
								placeholder="Nouvel email"
								className="w-full rounded-sm border border-white/10 bg-transparent p-2 text-sm text-white outline-none focus:border-purple-500/50"
								maxlength={200}
							/>
							<div className="flex justify-end gap-2">
								<ButtonStyle3 disabled={isDisabled} onClick={() => setIsEditingEmail(false)}>
									Cancel
								</ButtonStyle3>
								<ButtonStyle4 disabled={isDisabled} onClick={handleUpdateEmail}>
									Update
								</ButtonStyle4>
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
								disabled={isDisabled}
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
								disabled={isDisabled}
								value={currentPassword}
								onInput={(e: Event) => setCurrentPassword((e.target as HTMLInputElement).value)}
								placeholder="Current password"
								className="w-full rounded-sm border border-white/10 bg-transparent p-2 text-sm text-white outline-none focus:border-purple-500/50"
								maxlength={200}
							/>
							<input
								type="password"
								disabled={isDisabled}
								value={newPassword}
								onInput={(e: Event) => setNewPassword((e.target as HTMLInputElement).value)}
								placeholder="New password"
								className="w-full rounded-sm border border-white/10 bg-transparent p-2 text-sm text-white outline-none focus:border-purple-500/50"
								maxlength={200}
							/>
							<input
								type="password"
								disabled={isDisabled}
								value={confirmPassword}
								onInput={(e: Event) => setConfirmPassword((e.target as HTMLInputElement).value)}
								placeholder="Confirm the new password"
								className="w-full rounded-sm border border-white/10 bg-transparent p-2 text-sm text-white outline-none focus:border-purple-500/50"
								maxlength={200}
							/>
							<div className="flex justify-end gap-2">
								<ButtonStyle3 disabled={isDisabled} onClick={() => setIsEditingPassword(false)}>
									Cancel
								</ButtonStyle3>
								<ButtonStyle4 disabled={isDisabled} onClick={handleUpdatePassword}>
									Update
								</ButtonStyle4>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

