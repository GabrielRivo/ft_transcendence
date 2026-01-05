import { createElement } from 'my-react';
import type { Element } from 'my-react';

interface ButtonStyle5Props {
	children?: Element;
	onClick?: () => void;
}

export function ButtonStyle4({ children, onClick }: ButtonStyle5Props) {
	return (
		<button
			onClick={onClick}
			className={`group font-pirulen relative cursor-pointer overflow-hidden rounded-sm bg-white/5 px-6 py-2 text-sm text-gray-300 backdrop-blur-md transition-all duration-300 select-none hover:border-white/30 hover:bg-white/10 hover:text-white`}
		>
			<div className="absolute -top-[50%] -left-[50%] h-[200%] w-[50%] rotate-45 bg-linear-to-r from-transparent via-white/10 to-transparent transition-all duration-700 group-hover:left-full"></div>

			<span className="tracking-widest">{children}</span>
		</button>
	);
}
