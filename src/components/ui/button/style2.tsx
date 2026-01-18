import { createElement } from 'my-react';
import type { Element } from 'my-react';
interface ButtonStyle2Props {
	children?: Element;
	onClick?: (e: MouseEvent) => void | (() => void);
	color?: string; // ex: 'bg-cyan-500'
	className?: string;
}

export function ButtonStyle2({ children, onClick, className = 'text-white' }: ButtonStyle2Props) {
	// const [isClicked, setIsClicked] = useState(false);

	const handleClick = (e: MouseEvent) => {
		if (e && e.preventDefault) e.preventDefault();
		// setIsClicked(true);

		// // Petit effet de "clignotement" au clic
		// setTimeout(() => setIsClicked(false), 150);

		if (onClick) {
			setTimeout(() => onClick(e), 200);
		}
	};

	return (
		<button
			onClick={handleClick}
			style={'clip-path:  polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)'}
			className={`group font-pirulen relative px-10 py-4 text-sm tracking-widest transition-all duration-200 select-none cursor-pointer hover:brightness-140 active:scale-95
				hover:translate-y-1 
				hover:scale-105
			
				
				
				${className}
				
				
				`}
		>
			<div className="absolute top-0 right-0 size-2 border-t-2 border-r-2 border-current opacity-50  group-hover:size-3 transition-all duration-200 "></div>
			<div className="absolute bottom-0 left-0 size-2 border-b-2 border-l-2 border-current opacity-50 group-hover:size-1 transition-all duration-200 "></div>

			<span className="relative z-10 font-bold uppercase">{children}</span>
		</button>
	);
}
