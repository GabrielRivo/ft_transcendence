import { createElement } from 'my-react';
import { Link, useNavigate } from 'my-react-router';
import { ButtonStyle2 } from '@ui/button/style2';
import { ButtonStyle3 } from '@/components/ui/button/style3';
import { ButtonStyle4 } from '@/components/ui/button/style4';


export function OnlinePlayPage() {
	const navigate = useNavigate();

	const handleClickOnline = () => {
		navigate('/online');
	};

	const handleClickLocal = () => {
		navigate('/local');
	};

	return( <div className="flex flex-col items-center justify-center h-full gap-16">
			<h2 className="text-6xl font-bold text-white font-pirulen tracking-widest">Play</h2>
			<div className="flex flex-col gap-8 ">
				<ButtonStyle4 onClick={handleClickOnline}>Matchmaking</ButtonStyle4>
				<ButtonStyle4 onClick={handleClickLocal}>Challenge a Friend</ButtonStyle4>
				<ButtonStyle4 onClick={handleClickLocal}>Tournament</ButtonStyle4>
				<Link to="/play"  className="text-white text-center font-aquire font-bold tracking-widest hover:text-neon-blue">Return</Link>
			</div> 
		</div>); 
}