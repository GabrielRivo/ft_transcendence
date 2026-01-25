import { createElement, useState, useEffect } from 'my-react';
import type { Element } from 'my-react';
interface ButtonStyle1Props {
	children?: Element;
	onClick?: (e: MouseEvent) => void | (() => void);
	duration?: number;
	resetKey?: number;
}

export function ButtonStyle1({ children, onClick, duration = 400, resetKey }: ButtonStyle1Props) {
	const [isAnimating, setIsAnimating] = useState(false);

	useEffect(() => {
		if (isAnimating) {
			setIsAnimating(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [resetKey]);

	const handleClick = (e: MouseEvent) => {
		if (onClick) {
			if (e && typeof e.preventDefault === 'function') {
				e.preventDefault();
			}

			if (isAnimating) return;

			setIsAnimating(true);
			setTimeout(() => {
				onClick(e);
			}, duration);
		}
	};

	const textDuration = duration * 0.4;
	const moveDuration = duration * 0.6;
	const moveDelay = textDuration;

	return (
		<div
			className={`group grid-area-button relative flex h-36 w-fit justify-center justify-self-center px-8 transition-all duration-${moveDuration} select-none`}
			style={isAnimating ? `rotate: 180deg;` : undefined}
		>
			<svg
				aria-hidden="true"
				xmlns="http://www.w3.org/2000/svg"
				className={`text-secondary absolute top-0 bottom-0 left-0 aspect-24/202 h-full transition-all duration-200 group-hover:-left-[-10px]`}
				style={
					isAnimating
						? `left: 50%; transform: translateX(-100%); transition: all ${moveDuration}ms ease-in-out ${moveDelay}ms;`
						: undefined
				}
			>
				<use href="/svg/buttonSymbol.svg#symbol"></use>
			</svg>
			<svg
				aria-hidden="true"
				xmlns="http://www.w3.org/2000/svg"
				className={`text-secondary absolute top-0 right-0 bottom-0 aspect-24/202 h-full rotate-180 transition-all duration-200 group-hover:-right-[-10px]`}
				style={
					isAnimating
						? `right: 50%; transform: translateX(-100%); transition: all ${moveDuration}ms ease-in-out ${moveDelay}ms;`
						: undefined
				}
			>
				<use href="/svg/buttonSymbol.svg#symbol"></use>
			</svg>
			<button
				className={`text-secondary spacing font-pirulen group-hover:text-neon-blue inline-flex cursor-pointer items-center pl-[0.3em] text-2xl font-normal tracking-[0.3em] transition-all duration-600`}
				onClick={handleClick}
				style={
					isAnimating ? `opacity: 0; transition: opacity ${textDuration}ms ease-out; pointer-events: none;` : undefined
				}
			>
				{children}
			</button>
		</div>
	);
}
