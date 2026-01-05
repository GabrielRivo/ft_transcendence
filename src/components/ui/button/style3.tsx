import { createElement } from 'my-react';
import type { Element } from 'my-react';

interface ButtonStyle3Props {
	children?: Element;
	onClick?: () => void;
}

export function ButtonStyle3({ children, onClick }: ButtonStyle3Props) {
	return (
		<button
			onClick={onClick}
			className={`group font-pirulen relative cursor-pointer border-cyan-400 bg-transparent px-8 py-3 text-cyan-400 transition-all duration-300 select-none hover:bg-cyan-400/10 hover:text-white`}
		>
			<span className="absolute bottom-0 left-0 h-[2px] w-0 bg-white transition-all duration-300 group-hover:w-full"></span>

			<span className="tracking-[0.2em]">{children}</span>
		</button>
	);
}
