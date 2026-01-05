import { createElement } from 'my-react';
import type { Element } from 'my-react';
interface ButtonStyle2Props {
	children?: Element;
	onClick?: () => void;
	color?: string; // ex: 'bg-cyan-500'
}

export function ButtonStyle2({ children, onClick, color = 'bg-transparent' }: ButtonStyle2Props) {
	// const [isClicked, setIsClicked] = useState(false);

	const handleClick = (e: MouseEvent) => {
		if (e && e.preventDefault) e.preventDefault();
		// setIsClicked(true);

		// // Petit effet de "clignotement" au clic
		// setTimeout(() => setIsClicked(false), 150);

		if (onClick) {
			setTimeout(() => onClick(), 200);
		}
	};

	return (
		<button
			onClick={handleClick}
			style={'clip-path:  polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)'}
			className={`group font-pirulen relative px-10 py-4 text-sm tracking-widest text-white transition-all duration-200 select-none ${color} cursor-pointer hover:brightness-110 active:scale-95`}
		>
			<div className="absolute top-0 right-0 h-2 w-2 border-t-2 border-r-2 border-white opacity-50"></div>
			<div className="absolute bottom-0 left-0 h-2 w-2 border-b-2 border-l-2 border-white opacity-50"></div>

			<span className="relative z-10 font-bold uppercase">{children}</span>
		</button>
	);
}
