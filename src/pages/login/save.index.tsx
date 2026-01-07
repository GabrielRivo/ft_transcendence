import { createElement, useState } from 'my-react';
import { ButtonStyle1 } from '../../components/ui/button/style1';
import { ButtonStyle2 } from '../../components/ui/button/style2';
import { ButtonStyle3 } from '../../components/ui/button/style3';
import { ButtonStyle4 } from '../../components/ui/button/style4';

export function Login() {
	const [resetKey, setResetKey] = useState(0);

	const handleClick = () => {
		console.log('clicked');
		setResetKey(resetKey + 1);
	};

	return (
		<div className="flex flex-col gap-24">
			<ButtonStyle1 onClick={handleClick} duration={1000} resetKey={resetKey}>
				Commencer
			</ButtonStyle1>
			<ButtonStyle2 onClick={handleClick} color="bg-cyan-600/25">
				Commencer
			</ButtonStyle2>
			<ButtonStyle3 onClick={handleClick}>Commencer</ButtonStyle3>
			<ButtonStyle4 onClick={handleClick}>Commencer</ButtonStyle4>
		</div>
	);
}
