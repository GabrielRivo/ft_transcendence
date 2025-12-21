import { createElement } from 'my-react';

export function ButtonStyle1({ children }: { children?: any }) {
	return (
		<div className="group grid-area-button relative flex h-36 w-fit justify-center justify-self-center px-8">
			<svg
				aria-hidden="true"
				xmlns="http://www.w3.org/2000/svg"
				className="text-secondary absolute top-0 bottom-0 left-0 aspect-24/202 h-full transition-all duration-200 group-hover:-left-[5px]"
			>
				<use href="/svg/buttonSymbol.svg"></use>
			</svg>
			<svg
				aria-hidden="true"
				xmlns="http://www.w3.org/2000/svg"
				className="text-secondary absolute top-0 right-0 bottom-0 aspect-24/202 h-full rotate-180 transition-all duration-200 group-hover:-right-[5px]"
			>
				<use href="/svg/buttonSymbol.svg"></use>
			</svg>
			<button className="text-secondary spacing font-pirulen inline-flex cursor-pointer items-center pl-[0.3em] text-2xl font-normal tracking-[0.3em]">
				{children}
			</button>
		</div>
	);
}
