import { createElement } from 'my-react';
import { Link, useNavigate } from 'my-react-router';
import { ButtonStyle2 } from '@ui/button/style2';
import { ButtonStyle3 } from '@/components/ui/button/style3';
import { ButtonStyle4 } from '@/components/ui/button/style4';


export function OnlinePlayPage() {
	const navigate = useNavigate();

	const handleClickMatchmaking = () => {
		navigate('/matchmaking');
	};

	const handleClickLocal = () => {
		navigate('/local');
	};

	return( <div className="flex flex-col items-center justify-center h-full gap-24">
			<h2 className="text-6xl font-bold text-white font-pirulen tracking-widest">Play</h2>
			<div className="flex flex-col gap-8 ">
				<ButtonStyle4 onClick={handleClickMatchmaking} className="text-2xl">Matchmaking</ButtonStyle4>
				<ButtonStyle4 onClick={handleClickLocal} className="text-2xl">Challenge a Friend</ButtonStyle4>
				<ButtonStyle4 onClick={() => navigate('/play/tournament')} className="text-2xl">Tournament</ButtonStyle4>
				<Link to="/play"  className="text-white text-center font-pirulen font-bold tracking-widest hover:text-neon-blue text-lg">Return</Link>
			</div>
			
		</div>);
}