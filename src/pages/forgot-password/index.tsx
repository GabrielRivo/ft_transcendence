import 'reflect-metadata';
import { createElement, useState, useRef, useEffect } from 'my-react';
import { ButtonStyle4 } from '../../components/ui/button/style4';
import { ButtonStyle3 } from '../../components/ui/button/style3';
import { CardStyle2 } from '../../components/ui/card/style2';
import { useNavigate } from 'my-react-router';
import { useToast } from '../../hook/useToast';
import { useValidation, ValidationError } from '../../hook/useValidation';
import { ForgotPasswordSchema, VerifyResetOtpSchema, ResetPasswordSchema } from '../../dto';
import { Modal } from '../../components/ui/modal';

function InputPassword({ value, onChange, type, title = '', error = false, inputRef }: { value: string; onChange: (value: string) => void; type: string; title?: string; error?: string | boolean; inputRef?: any }) {
	return (
		<div className="group flex flex-col gap-2">
			<label className="font-pirulen text-xs tracking-wider text-gray-400 transition-colors group-focus-within:text-white">
				{title}
			</label>
			<input
				ref={inputRef}
				type={type}
				value={value}
				onInput={(e: Event) => onChange((e.target as HTMLInputElement).value)}
				className="focus:border-neon-blue w-full rounded-sm border border-white/10 bg-transparent p-3 text-sm text-white transition-all duration-300 outline-none placeholder:text-gray-600 focus:bg-white/5"
				placeholder="••••••••"
			/>
			{error && <span className="text-xs text-red-400">{error}</span>}
		</div>
	);
}

export function ForgotPassword() {
	const [email, setEmail] = useState('');
	const [otp, setOtp] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<ValidationError[]>([]);
	const [showOTPModal, setShowOTPModal] = useState(false);
	const [showResetModal, setShowResetModal] = useState(false);

	const newPasswordRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (showResetModal && newPasswordRef.current) {
			newPasswordRef.current.focus();
		}
	}, [showResetModal]);

	const navigate = useNavigate();
	const { toast } = useToast();
	const { validate: validateEmail, getFieldError: getEmailFieldError } = useValidation(ForgotPasswordSchema);
	const { validate: validateOtp, getFieldError: getOtpFieldError } = useValidation(VerifyResetOtpSchema);
	const { validate: validateReset, getFieldError: getResetFieldError } = useValidation(ResetPasswordSchema);

	// Submit email for forgot password
	const handleSubmitEmail = async (e: Event): Promise<void> => {
		e.preventDefault();
		setErrors([]);

		const result = validateEmail({ email });
		if (!result.valid) {
			setErrors(result.errors);
			toast('Please fix errors', 'warning', 3000);
			return;
		}

		setIsLoading(true);

		try {
			const response = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email }),
			});

			if (response.ok) {
				toast('Reset code sent to your email', 'success', 3000);
				setShowOTPModal(true);
			} else {
				const data = await response.json();
				toast(data.message || 'Failed to send reset code', 'error', 3000);
			}
		} catch {
			toast('An error has occurred', 'error', 3000);
		} finally {
			setIsLoading(false);
		}
	};

	// Submit OTP verification
	const handleSubmitOTP = async (e: Event): Promise<void> => {
		e.preventDefault();
		setErrors([]);

		const result = validateOtp({ email, otp });
		if (!result.valid) {
			setErrors(result.errors);
			toast('Please fix errors', 'warning');
			return;
		}

		setIsLoading(true);

		try {
			const response = await fetch('/api/auth/verify-reset-otp', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, otp }),
			});

			if (response.ok) {
				toast('OTP verified successfully', 'success');
				setShowOTPModal(false);
				setShowResetModal(true);
			} else {
				const data = await response.json();
				toast(data.message || 'Invalid OTP', 'error');
			}
		} catch {
			toast('An error has occurred', 'error');
		} finally {
			setIsLoading(false);
		}
	};

	// Submit new password
	const handleSubmitReset = async (e: Event): Promise<void> => {
		e.preventDefault();
		setErrors([]);

		if (newPassword !== confirmPassword) {
			toast('Passwords do not match', 'error');
			return;
		}

		const result = validateReset({ email, otp, newPassword });
		if (!result.valid) {
			setErrors(result.errors);
			toast('Please fix errors', 'warning');
			return;
		}

		setIsLoading(true);

		try {
			const response = await fetch('/api/auth/reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, otp, newPassword }),
			});

			if (response.ok) {
				toast('Password reset successfully', 'success');
				setShowResetModal(false);
				navigate('/login');
			} else {
				const data = await response.json();
				toast(data.message || 'Failed to reset password', 'error');
			}
		} catch {
			toast('An error has occurred', 'error');
		} finally {
			setIsLoading(false);
		}
	};

	const emailError = getEmailFieldError(errors, 'email');
	const otpError = getOtpFieldError(errors, 'otp');
	const passwordError = getResetFieldError(errors, 'newPassword');

	const handleClickReturn = (e: MouseEvent): void => {
		e.preventDefault();
		navigate('/login');
	};

	return (
		<div className="relative size-full">
			<div className="relative z-10 flex h-full items-center justify-center p-4">
				<CardStyle2>
					<div className="flex w-full flex-col gap-8">
						<div className="text-center">
							<h1 className="font-pirulen text-xl tracking-widest text-white">Forgot Password</h1>
							<p className="mt-2 text-sm text-gray-400">Enter your email to receive a reset code</p>
						</div>
						<form className="flex flex-col gap-6" onSubmit={handleSubmitEmail}>
							<div className="group flex flex-col gap-2">
								<label
									htmlFor="email"
									className="font-pirulen text-xs tracking-wider text-gray-400 transition-colors group-focus-within:text-white"
								>
									Mail
								</label>
								<input
									type="email"
									id="email"
									name="email"
									value={email}
									onInput={(e: Event) => setEmail((e.target as HTMLInputElement).value)}
									className={`focus:border-neon-blue w-full rounded-sm border bg-transparent p-3 text-sm text-white transition-all duration-300 outline-none placeholder:text-gray-600 focus:bg-white/5 ${emailError ? 'border-red-500' : 'border-white/10'}`}
									placeholder="name@example.com"
								/>
								{emailError && <span className="text-xs text-red-400">{emailError}</span>}
							</div>
							<div className="mt-4 flex flex-col justify-center gap-2">
								<ButtonStyle4 type="submit">{isLoading ? 'SENDING...' : 'Send reset code'}</ButtonStyle4>
								<ButtonStyle3 onClick={handleClickReturn}>Return</ButtonStyle3>
							</div>
						</form>
					</div>
				</CardStyle2>
			</div>

			{/* OTP Modal */}
			{showOTPModal && (
				<Modal onClose={() => setShowOTPModal(false)} title="Enter Reset Code" variant="cyan">
					<form className="flex flex-col gap-6" onSubmit={handleSubmitOTP}>
						<div className="group flex flex-col gap-2">
							<label
								htmlFor="otp"
								className="font-pirulen text-xs tracking-wider text-gray-400 transition-colors group-focus-within:text-white"
							>
								Reset Code
							</label>
							<input
								type="text"
								id="otp"
								name="otp"
								value={otp}
								onInput={(e: Event) => setOtp((e.target as HTMLInputElement).value)}
								className={`focus:border-neon-blue w-full rounded-sm border bg-transparent p-3 text-center text-2xl tracking-[0.5em] text-white transition-all duration-300 outline-none placeholder:text-gray-600 focus:bg-white/5 ${otpError ? 'border-red-500' : 'border-white/10'}`}
								placeholder="000000"
								maxLength={6}
								autoFocus
							/>
							{otpError && <span className="text-xs text-red-400">{otpError}</span>}
							<p className="text-xs text-gray-500">The code is valid for 10 minutes</p>
						</div>
						<div className="mt-4 flex flex-col justify-center gap-2">
							<ButtonStyle4 type="submit">{isLoading ? 'VERIFYING...' : 'Verify'}</ButtonStyle4>
						</div>
					</form>
				</Modal>
			)}

			{/* Reset Password Modal */}
			{showResetModal && (
				<Modal onClose={() => setShowResetModal(false)} title="Reset Password" variant="cyan">
					<form className="flex flex-col gap-6" onSubmit={handleSubmitReset}>
						<InputPassword inputRef={newPasswordRef} value={newPassword} onChange={setNewPassword} type="password" title="New Password" error={passwordError} />
						<InputPassword value={confirmPassword} onChange={setConfirmPassword} type="password" title="Confirm Password" error={false} />
						<div className="mt-4 flex flex-col justify-center gap-2">
							<ButtonStyle4 type="submit">{isLoading ? 'RESETTING...' : 'Reset password'}</ButtonStyle4>
						</div>
					</form>
				</Modal>
			)}
		</div>
	);
}
