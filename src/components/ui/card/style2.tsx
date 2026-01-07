import { createElement, useState, useCallback } from 'my-react';
import type { Element } from 'my-react';

interface CardStyle1Props {
	children?: Element | Element[];
	className?: string;
}

export function CardStyle2({ children, className = '' }: CardStyle1Props) {
	const [svgState, setSvgState] = useState({ d: '', opacity: 0 });

	const measureRef = useCallback((node: HTMLDivElement | null) => {
		if (!node) return;

		const update = () => {
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

		const observer = new ResizeObserver(() => update());
		observer.observe(node);

		const timer = setInterval(update, 100);
		setTimeout(() => clearInterval(timer), 1000);
	}, []);

	return (
		<div ref={measureRef} className={`relative w-fit ${className}`}>
			<svg
				className="pointer-events-none absolute inset-0 z-0 h-full w-full"
				style={`opacity: ${svgState.opacity}; transition: opacity 0.2s ease-in;`}
			>
				<path
					d={svgState.d}
					stroke="rgba(255, 255, 255, 0.02)"
					stroke-width="10"
					fill="none"
					vector-effect="non-scaling-stroke"
				/>
			</svg>

			<div className="relative p-10">
				<div className="relative z-10 flex h-full w-full min-w-[300px] flex-col items-center justify-center px-12 py-16">
					{children}
				</div>
			</div>
		</div>
	);
}
