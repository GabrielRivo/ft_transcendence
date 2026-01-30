import { createElement } from 'my-react';
import type { Element } from 'my-react';

interface ButtonStyle3Props {
	children?: Element;
	onClick?: (e: MouseEvent) => void | (() => void);
	type?: 'button' | 'submit' | 'reset';
	disabled?: boolean;
}

export function ButtonStyle3({ children, onClick, type = 'button', disabled = false }: ButtonStyle3Props) {
	return (
		<button
			type={type}
			onClick={onClick}
			disabled={disabled}
			className={`group font-pirulen relative cursor-pointer border-cyan-400 bg-transparent px-8 py-3 text-cyan-400 transition-all duration-300 select-none hover:bg-cyan-400/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50`}
		>
			<span className="absolute bottom-0 left-0 z-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>

			<span className="tracking-[0.2em z-10 text-xs text-shadow-2xs">{children}</span>
		</button>
	);
}
