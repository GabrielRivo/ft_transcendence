import { createElement, Element } from 'my-react';

type ButtonProgressProps = {
    max: number;
    current: number;
    className?: string;
    children?: Element;
    [key: string]: unknown;
};

export function ButtonProgress({ max, current, className = '', children, ...rest }: ButtonProgressProps) {
    return (
        <button
            className={`relative mt-1 w-full overflow-hidden rounded border border-purple-500/30 bg-purple-500/10 py-4 font-bold text-white transition-all disabled:opacity-50`}
            {...rest} disabled={current >= max}
        >
            <div className={`absolute z-0 aspect-square rounded-full transition-all duration-300 ease-out left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 ${className}`} style={`width: ${current * 200 / max}%`} />
            <div className={`w-full relative z-1`}>
                {children}
            </div>
        </button>
    );
}