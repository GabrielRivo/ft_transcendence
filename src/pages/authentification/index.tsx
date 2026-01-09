import { createElement, useState } from 'my-react';
import { ButtonStyle4 } from '../../components/ui/button/style4';
import { Discord } from '../../components/ui/logo/discord';
import { Github } from '../../components/ui/logo/github';
import { useNavigate } from 'my-react-router';
export function Authentification() {
	const [resetKey, setResetKey] = useState(0);

	const navigate = useNavigate();

	const handleClick = () => {
		console.log('clicked');
		navigate('/login');
		setResetKey(resetKey + 1);
	};

	return (
		<div className="flex flex-col items-center gap-8 text-white">
			<h1 className="font-aquire text-2xl font-bold">Authentification</h1>
			<p className="text-s font-orbitron">Connectez-vous à votre compte pour accéder à votre espace personnel.</p>
			<div className="flex min-w-2/3 flex-col gap-2">
				<ButtonStyle4 onClick={handleClick}>Me connecter</ButtonStyle4>
				<ButtonStyle4 onClick={handleClick}>Me créer un compte</ButtonStyle4>
			</div>
			<div className="flex w-full items-center gap-2">
				<hr className="w-full" />
				<span>OU</span>
				<hr className="w-full" />
			</div>
			<div className="flex min-w-2/3 flex-col gap-2">
				<ButtonStyle4 onClick={handleClick}>
					<div className="flex w-full items-center gap-2">
						<Github size={20} /> <span>Github</span>
					</div>
				</ButtonStyle4>
				<ButtonStyle4 onClick={handleClick}>
					<div className="flex w-full items-center gap-2">
						<Discord size={20} /> <span>Discord</span>
					</div>
				</ButtonStyle4>
			</div>
		</div>
	);
}
