import 'reflect-metadata';
import { createElement, useState } from 'my-react';
import { ButtonStyle4 } from '../../components/ui/button/style4';
import { CardStyle2 } from '../../components/ui/card/style2';
import { ButtonStyle3 } from '../../components/ui/button/style3';
import { useNavigate } from 'my-react-router';
import { useAuth } from '../../hook/useAuth';
import { useToast } from '../../hook/useToast';
import { useValidation, ValidationError } from '../../hook/useValidation';
import { RegisterSchema } from '../../dto';

export function Register() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<ValidationError[]>([]);
	const [confirmError, setConfirmError] = useState<string | null>(null);

	const navigate = useNavigate();
	const { register } = useAuth();
	const { toast } = useToast();
	const { validate, getFieldError } = useValidation(RegisterSchema);

	const handleSubmit = async (e: Event): Promise<void> => {
		e.preventDefault();
		setErrors([]);
		setConfirmError(null);

		const result = validate({ email, password });
		if (!result.valid) {
			setErrors(result.errors);
			toast('Veuillez corriger les erreurs', 'warning');
			return;
		}

		if (password !== confirmPassword) {
			setConfirmError(`Passwords doesn't match`);
			toast(`Passwords doesn't match`, 'error');
			return;
		}

		setIsLoading(true);

		try {
			const success = await register(email, password);

			if (success) {
				toast('Registered!', 'success');
				navigate('/play');
			} else {
				toast("Register failed, the mail may be already used", 'error');
			}
		} catch {
			toast('An error has occurred', 'error');
		} finally {
			setIsLoading(false);
		}
	};

	const handleClickReturn = (e: MouseEvent): void => {
		e.preventDefault();
		navigate('/authentification');
	};

	const emailError = getFieldError(errors, 'email');
	const passwordError = getFieldError(errors, 'password');

	return (
		<div className="relative size-full">
			<div className="relative z-10 flex h-full items-center justify-center p-4">
				<CardStyle2>
					<div className="flex w-full flex-col gap-8">
						<h1 className="font-pirulen text-center text-xl tracking-widest text-white">Subscription</h1>
						<form className="flex flex-col gap-6" onSubmit={handleSubmit}>
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
							<div className="group flex flex-col gap-2">
								<label
									htmlFor="password"
									className="font-pirulen text-xs tracking-wider text-gray-400 transition-colors group-focus-within:text-white"
								>
									Passeword
								</label>
								<input
									type="password"
									id="password"
									name="password"
									value={password}
									onInput={(e: Event) => setPassword((e.target as HTMLInputElement).value)}
									className={`focus:border-neon-blue w-full rounded-sm border bg-transparent p-3 text-sm text-white transition-all duration-300 outline-none placeholder:text-gray-600 focus:bg-white/5 ${passwordError ? 'border-red-500' : 'border-white/10'}`}
									placeholder="••••••••"
								/>
								{passwordError && <span className="text-xs text-red-400">{passwordError}</span>}
							</div>
							<div className="group flex flex-col gap-2">
								<label
									htmlFor="confirmPassword"
									className="font-pirulen text-xs tracking-wider text-gray-400 transition-colors group-focus-within:text-white"
								>
									Confirme passeword
								</label>
								<input
									type="password"
									id="confirmPassword"
									name="confirmPassword"
									value={confirmPassword}
									onInput={(e: Event) => setConfirmPassword((e.target as HTMLInputElement).value)}
									className={`focus:border-neon-blue w-full rounded-sm border bg-transparent p-3 text-sm text-white transition-all duration-300 outline-none placeholder:text-gray-600 focus:bg-white/5 ${confirmError ? 'border-red-500' : 'border-white/10'}`}
									placeholder="••••••••"
								/>
								{confirmError && <span className="text-xs text-red-400">{confirmError}</span>}
							</div>
							<div className="mt-4 flex flex-col justify-center gap-2">
								<ButtonStyle4 type="submit">{isLoading ? 'INSCRIPTION...' : "S'INSCRIRE"}</ButtonStyle4>
								<ButtonStyle3 onClick={handleClickReturn}>Return</ButtonStyle3>
							</div>
						</form>
					</div>
				</CardStyle2>
			</div>
		</div>
	);
}
