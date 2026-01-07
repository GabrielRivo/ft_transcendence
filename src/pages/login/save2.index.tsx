import { createElement, useState } from 'my-react';
import { ButtonStyle1 } from '../../components/ui/button/style1';
import { ButtonStyle2 } from '../../components/ui/button/style2';
import { ButtonStyle3 } from '../../components/ui/button/style3';
import { ButtonStyle4 } from '../../components/ui/button/style4';
import { CardStyle1 } from '../../components/ui/card/style1';

export function Login() {
	const [resetKey, setResetKey] = useState(0);

	const handleClick = () => {
		console.log('clicked');
		setResetKey(resetKey + 1);
	};

	return (
		<CardStyle1>
			<div className="flex flex-col gap-24">
				<ButtonStyle1 onClick={handleClick}>Click me</ButtonStyle1>
			</div>
		</CardStyle1>
	);
}
