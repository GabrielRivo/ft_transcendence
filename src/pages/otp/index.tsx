import 'reflect-metadata';
import { createElement, useState } from 'my-react';
import { ButtonStyle4 } from '../../components/ui/button/style4';
import { CardStyle2 } from '../../components/ui/card/style2';
import { useNavigate } from 'my-react-router';
import { useAuth } from '../../hook/useAuth';
import { useToast } from '../../hook/useToast';
import { useValidation, ValidationError } from '../../hook/useValidation';
import { OTPSchema } from '../../dto';

export function OTP() {
	const [code, setCode] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<ValidationError[]>([]);

	const navigate = useNavigate();
	const { verify2FA } = useAuth();
	const { toast } = useToast();
	const { validate, getFieldError } = useValidation(OTPSchema);

	const handleSubmit = async (e: Event): Promise<void> => {
		e.preventDefault();
		setErrors([]);

		const result = validate({ code });
		if (!result.valid) {
			setErrors(result.errors);
			return;
		}

		setIsLoading(true);

		try {
			const success = await verify2FA(code);

			if (success) {
				toast('2FA verification successful!', 'success');
				navigate('/play');
			} else {
				toast('Invalid code, please try again', 'error');
			}
		} catch {
			toast('An error has occurred', 'error');
		} finally {
			setIsLoading(false);
		}
	};

	const codeError = getFieldError(errors, 'code');

	return (
		<div className="relative size-full">
			<div className="relative z-10 flex h-full items-center justify-center p-4">
				<CardStyle2>
					<div className="flex w-full flex-col gap-8">
						<div className="text-center">
							<h1 className="font-pirulen text-xl tracking-widest text-white">2FA Verification</h1>
							<p className="mt-2 text-sm text-gray-400">Enter the 6-digit code from your authenticator app</p>
						</div>
						<form className="flex flex-col gap-6" onSubmit={handleSubmit}>
							<div className="group flex flex-col gap-2">
								<label
									htmlFor="code"
									className="font-pirulen text-xs tracking-wider text-gray-400 transition-colors group-focus-within:text-white"
								>
									Code
								</label>
								<input
									type="text"
									id="code"
									name="code"
									value={code}
									onInput={(e: Event) => setCode((e.target as HTMLInputElement).value)}
									className={`focus:border-neon-blue w-full rounded-sm border bg-transparent p-3 text-center text-2xl tracking-[0.5em] text-white transition-all duration-300 outline-none placeholder:text-gray-600 focus:bg-white/5 ${codeError ? 'border-red-500' : 'border-white/10'}`}
									placeholder="000000"
									maxLength={6}
									autoFocus
								/>
								{codeError && <span className="text-xs text-red-400">{codeError}</span>}
								<p className="text-xs text-gray-500">Enter the 6-digit code from Google Authenticator or similar app</p>
							</div>
							<div className="mt-4 flex flex-col justify-center gap-2">
								<ButtonStyle4 type="submit">{isLoading ? 'VERIFYING...' : 'VERIFY'}</ButtonStyle4>
							</div>
						</form>
					</div>
				</CardStyle2>
			</div>
		</div>
	);
}
