import { createElement } from 'my-react';
import { ButtonStyle4 } from '../../components/ui/button/style4';
import { Discord } from '@icon/discord';
import { Github } from '@icon/github';
import { useNavigate } from 'my-react-router';

const API_BASE = '/api/auth';

export function Authentification() {
	const navigate = useNavigate();

	const handleOAuthLogin = (provider: 'github' | 'discord') => {
		window.location.href = `${API_BASE}/${provider}/redirect/uri`;
	};

	return (
		<div className="flex flex-col items-center gap-8 text-white">
			<h1 className="font-aquire text-2xl font-bold">Authentification</h1>
			<p className="text-s font-orbitron">Log in to your account to access your personal space.</p>
			<div className="flex min-w-2/3 flex-col gap-2">
				<ButtonStyle4 onClick={() => navigate('/login')}>Log in</ButtonStyle4>
				<ButtonStyle4 onClick={() => navigate('/register')}>Create an account</ButtonStyle4>
			</div>
			<div className="flex w-full items-center gap-2">
				<hr className="w-full" />
				<span>OU</span>
				<hr className="w-full" />
			</div>
			<div className="flex min-w-2/3 flex-col gap-2">
				<ButtonStyle4 onClick={() => handleOAuthLogin('github')}>
					<div className="flex w-full items-center gap-2">
						<Github size={20} className="text-white" /> <span>Github</span>
					</div>
				</ButtonStyle4>
				<ButtonStyle4 onClick={() => handleOAuthLogin('discord')}>
					<div className="flex w-full items-center gap-2">
						<Discord size={20} className="text-white" /> <span>Discord</span>
					</div>
				</ButtonStyle4>
			</div>
		</div>
	);
}
