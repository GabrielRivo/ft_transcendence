import 'reflect-metadata';
import { createElement, useState, useEffect } from 'my-react';
import { ButtonStyle4 } from '../../components/ui/button/style4';
import { CardStyle2 } from '../../components/ui/card/style2';
import { useNavigate } from 'my-react-router';
import { useAuth } from '../../hook/useAuth';
import { useToast } from '../../hook/useToast';
import { useValidation, ValidationError } from '../../hook/useValidation';
import { SetUsernameSchema } from '../../dto';

export function SetUsername() {
	const [username, setUsernameValue] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<ValidationError[]>([]);

	const navigate = useNavigate();
	const { user, setUsername } = useAuth();
	const { toast } = useToast();
	const { validate, getFieldError } = useValidation(SetUsernameSchema);

	// Pré-remplir avec le username suggéré du provider OAuth
	useEffect(() => {
		if (user?.suggestedUsername && username === '') {
			setUsernameValue(user.suggestedUsername);
		}
	}, [user?.suggestedUsername]);

	const handleSubmit = async (e: Event): Promise<void> => {
		e.preventDefault();
		setErrors([]);

		// Validate with AJV
		const result = validate({ username });
		if (!result.valid) {
			setErrors(result.errors);
			toast('Please correct the errors', 'warning');
			return;
		}

		setIsLoading(true);

		try {
			const success = await setUsername(username);

			if (success) {
				toast('Username successfully set!', 'success');
				navigate('/play');
			} else {
				toast('This username is already in use or invalid', 'error');
			}
		} catch {
			toast('An error has occurred', 'error');
		} finally {
			setIsLoading(false);
		}
	};

	const usernameError = getFieldError(errors, 'username');

	return (
		<div className="relative size-full">
			<div className="relative z-10 flex h-full items-center justify-center p-4">
				<CardStyle2>
					<div className="flex w-full flex-col gap-8">
						<div className="text-center">
							<h1 className="font-pirulen text-xl tracking-widest text-white">Choose a nickname</h1>
							<p className="mt-2 text-sm text-gray-400">Choose a unique username for your account</p>
						</div>
						<form className="flex flex-col gap-6" onSubmit={handleSubmit}>
							<div className="group flex flex-col gap-2">
								<label
									htmlFor="username"
									className="font-pirulen text-xs tracking-wider text-gray-400 transition-colors group-focus-within:text-white"
								>
									Pseudo
								</label>
								<input
									type="text"
									id="username"
									name="username"
									value={username}
									onInput={(e: Event) => setUsernameValue((e.target as HTMLInputElement).value)}
									className={`focus:border-neon-blue w-full rounded-sm border bg-transparent p-3 text-sm text-white transition-all duration-300 outline-none placeholder:text-gray-600 focus:bg-white/5 ${usernameError ? 'border-red-500' : 'border-white/10'}`}
									placeholder="Username123"
									autoFocus
								/>
								{usernameError && <span className="text-xs text-red-400">{usernameError}</span>}
								<p className="text-xs text-gray-500">3-20 characters, letters, numbers and underscores only</p>
							</div>
							<div className="mt-4 flex flex-col justify-center gap-2">
								<ButtonStyle4 type="submit">{isLoading ? 'REGISTRATION...': 'VALIDATE'}</ButtonStyle4>
							</div>
						</form>
					</div>
				</CardStyle2>
			</div>
		</div>
	);
}
