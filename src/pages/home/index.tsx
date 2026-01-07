import { createElement } from 'my-react';
import { Link, useNavigate } from 'my-react-router';
import { ButtonStyle1 } from '../../components/ui/button/style1';

import { useToast } from '../../components/ui/toaster';

export function Home() {
	const navigate = useNavigate();
	const { toast } = useToast();

	const handleClick = () => {
		toast(`Oops tu n'es pas encore connecté ! 💩`, 'error');
		navigate('/login');
	};

	return (
		<div className="text-neon-blue">
			<ButtonStyle1 onClick={handleClick} duration={500}>
				Commencer
			</ButtonStyle1>
		</div>
	);
}
