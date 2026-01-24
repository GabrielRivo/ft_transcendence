import 'reflect-metadata';
import { createElement, useState } from 'my-react';
import { ButtonStyle4 } from '../../components/ui/button/style4';
import { CardStyle2 } from '../../components/ui/card/style2';
import { ButtonStyle3 } from '../../components/ui/button/style3';
import { Link, useNavigate } from 'my-react-router';
import { useAuth } from '../../hook/useAuth';
import { useToast } from '../../hook/useToast';
import { useValidation, ValidationError } from '../../hook/useValidation';
import { LoginSchema } from '../../dto';

export function Login() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<ValidationError[]>([]);

	const navigate = useNavigate();
	const { login } = useAuth();
	const { toast } = useToast();
	const { validate, getFieldError } = useValidation(LoginSchema);

	const handleSubmit = async (e: Event): Promise<void> => {
		e.preventDefault();
		setErrors([]);

		// Validate with AJV
		const result = validate({ email, password });
		if (!result.valid) {
			setErrors(result.errors);
			toast('Please fix errors', 'warning');
			return;
		}

		setIsLoading(true);

		try {
			const success = await login(email, password);

			if (success) {
				toast('Connection success', 'success');
				navigate('/play');
			} else {
				toast('Mail or passeword incorrect', 'error');
			}
		} catch {
			toast('An error has occurred', 'error');
		} finally {
			setIsLoading(false);
		}
	};

	const emailError = getFieldError(errors, 'email');
	const passwordError = getFieldError(errors, 'password');

	const handleClickReturn = (e: MouseEvent): void => {
		e.preventDefault();
		navigate('/authentification');
	};

	return (
		<div className="relative size-full">
			<div className="relative z-10 flex h-full items-center justify-center p-4">
				<CardStyle2>
					<div className="flex w-full flex-col gap-8">
						<h1 className="font-pirulen text-center text-xl tracking-widest text-white">Connexion</h1>
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
									Password
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
							<div className="mt-4 flex flex-col justify-center gap-2">
								<Link to="/forgot-password" className="text-secondary hover:text-neon-blue">
									Forgot passeword
								</Link>
								<ButtonStyle4 type="submit">{isLoading ? 'CONNEXION...' : 'Connect'}</ButtonStyle4>
								<ButtonStyle3 onClick={handleClickReturn}>Return</ButtonStyle3>
							</div>
						</form>
					</div>
				</CardStyle2>
			</div>
		</div>
	);
}
