import { createElement } from 'my-react';
import { useNavigate } from 'my-react-router';
import { ButtonStyle1 } from '../../components/ui/button/style1';

export function Home() {
	const navigate = useNavigate();

	const handleClick = () => {
		navigate('/authentification');
	};

	return (
		<div className="text-neon-blue">
			<ButtonStyle1 onClick={handleClick} duration={500}>
				Start
			</ButtonStyle1>
		</div>
	);
}
