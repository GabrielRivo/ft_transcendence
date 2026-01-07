import { createElement, useState } from 'my-react';
import { ButtonStyle1 } from '../../components/ui/button/style1';
import { ButtonStyle2 } from '../../components/ui/button/style2';
import { ButtonStyle3 } from '../../components/ui/button/style3';
import { ButtonStyle4 } from '../../components/ui/button/style4';
import { CardStyle2 } from '../../components/ui/card/style2';

function Border() {
	return (
		<svg
			className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
			viewBox="0 0 829 576"
			preserveAspectRatio="none"
		>
			<path
				d="M 40 0 L 788.8125 0 L 828.8125 40 L 828.8125 536 L 788.8125 576 L 40 576 L 0 536 L 0 40 Z"
				stroke="rgba(255, 255, 255, 0.02)"
				stroke-width="10"
				fill="none"
				vector-effect="non-scaling-stroke"
			></path>
		</svg>
	);
}

export function Login() {
	const [resetKey, setResetKey] = useState(0);

	const handleClick = () => {
		console.log('clicked');
		setResetKey(resetKey + 1);
	};

	return (
		<div className="relative h-full w-full">
			<div className="relative z-10 flex h-full items-center justify-center p-4">
				<CardStyle2>
					<div className="flex w-full flex-col gap-8">
						<h1 className="font-pirulen text-center text-xl tracking-widest text-white">Connexion</h1>
						<form className="flex flex-col gap-6">
							<div className="group flex flex-col gap-2">
								<label
									htmlFor="email"
									className="font-pirulen text-xs tracking-wider text-gray-400 transition-colors group-focus-within:text-white"
								>
									Email
								</label>
								<input
									type="email"
									id="email"
									name="email"
									className="focus:border-neon-blue w-full rounded-sm border border-white/10 bg-transparent p-3 text-sm text-white transition-all duration-300 outline-none placeholder:text-gray-600 focus:bg-white/5"
									placeholder="name@example.com"
								/>
							</div>
							<div className="group flex flex-col gap-2">
								<label
									htmlFor="password"
									className="font-pirulen text-xs tracking-wider text-gray-400 transition-colors group-focus-within:text-white"
								>
									Password
								</label>
								<input
									type="password"
									id="password"
									name="password"
									className="focus:border-neon-blue w-full rounded-sm border border-white/10 bg-transparent p-3 text-sm text-white transition-all duration-300 outline-none placeholder:text-gray-600 focus:bg-white/5"
									placeholder="••••••••"
								/>
							</div>
							<div className="mt-4 flex justify-center">
								<ButtonStyle4 onClick={handleClick}>SE CONNECTER</ButtonStyle4>
							</div>
						</form>
					</div>
				</CardStyle2>
			</div>
		</div>
	);
}
