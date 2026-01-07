import { createElement, useState, useCallback } from 'my-react';
import type { Element } from 'my-react';

interface CardStyle1Props {
	children?: Element | Element[];
	className?: string;
}

function Bracket({ position }: { position: 'top' | 'bottom' }) {
	const isTop = position === 'top';
	return (
		<div className={`pointer-events-none absolute left-0 z-10 h-16 w-full ${isTop ? 'top-0 rotate-180' : 'bottom-0'}`}>
			<svg className="absolute bottom-0 left-0 h-full w-[64px]" viewBox="0 0 454 454" preserveAspectRatio="none">
				<use href="/svg/card-bracket.svg#corner-left" />
			</svg>
			<svg className="absolute right-0 bottom-0 h-full w-[64px]" viewBox="0 0 454 454" preserveAspectRatio="none">
				<use href="/svg/card-bracket.svg#corner-right" />
			</svg>
			<div className="bg-neon-blue absolute right-[63px] bottom-0 left-[63px] h-1" />
		</div>
	);
}

export function CardStyle1({ children, className = '' }: CardStyle1Props) {
	const [svgState, setSvgState] = useState({ d: '', opacity: 0 });

	const measureRef = useCallback((node: HTMLDivElement | null) => {
		console.log('measureRef', node);
		if (!node) return;

		const update = () => {
			console.log('update');
			const rect = node.getBoundingClientRect();

			if (rect.width === 0 || rect.height === 0) return;

			const w = rect.width;
			const h = rect.height;
			const cut = 40;

			const newPath = `
                M ${cut} 0 
                L ${w - cut} 0 
                L ${w} ${cut} 
                L ${w} ${h - cut} 
                L ${w - cut} ${h} 
                L ${cut} ${h} 
                L 0 ${h - cut} 
                L 0 ${cut} 
                Z
            `;

			setSvgState({ d: newPath, opacity: 1 });
		};

		update();

		// const observer = new ResizeObserver(() => update());
		// observer.observe(node);

		// update resize window

		window.addEventListener('resize', update);

		const timer = setInterval(update, 100);
		setTimeout(() => clearInterval(timer), 1000);

		// return () => {
		// 	observer.disconnect();
		// 	clearInterval(timer);
		// 	window.removeEventListener('resize', update);
		// };
	}, []);

	return (
		<div ref={measureRef} className={`relative w-fit ${className}`}>
			<svg
				className="pointer-events-none absolute inset-0 z-0 h-full w-full"
				style={`opacity: ${svgState.opacity}; transition: opacity 0.2s ease-in;`}
			>
				<path
					d={svgState.d}
					stroke="rgba(255, 255, 255, 0.25)"
					stroke-width="2"
					fill="none"
					vector-effect="non-scaling-stroke"
				/>
			</svg>

			<div className="relative p-10">
				<div className="relative z-10 flex h-full w-full min-w-[300px] flex-col items-center justify-center px-12 py-16">
					<Bracket position="top" />
					{children}
					<Bracket position="bottom" />
				</div>
			</div>
		</div>
	);
}
