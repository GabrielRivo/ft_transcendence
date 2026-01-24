import { createElement } from 'my-react';
import { useNavigate } from 'my-react-router';
import { ButtonStyle2 } from '@ui/button/style2';


export function PlayPage() {
	const navigate = useNavigate();

	const handleClickOnline = () => {
		navigate('/online');
	};

	const handleClickLocal = () => {
		navigate('/local');
	};

	return( <div className="flex flex-col items-center justify-center h-full gap-16">
			<h2 className="text-6xl font-bold text-white font-pirulen tracking-widest">Play</h2>
			<div className="flex gap-24">
				<ButtonStyle2  className="text-white bg-red-500/50" onClick={handleClickLocal}>Local</ButtonStyle2>
				<ButtonStyle2  className="text-white bg-cyan-500/50" onClick={handleClickOnline}>Online</ButtonStyle2>
			</div>
		</div>);
}