import { createElement } from 'my-react';
import type { Element } from 'my-react';
import { useGame } from '../hook/useGame';
import { GameResultModal } from '@/components/game/GameResultModal';

export function MainLayout({ children }: { children?: Element }) {
	const { canvasRef, mode, gameResult, clearGameResult } = useGame();

	// Apply blur only in background mode
	const canvasClasses = `block size-full ${mode === 'background' ? 'blur-sm' : ''}`;

	// In online/local mode, allow events to pass through to canvas
	const isPlayingMode = mode === 'online' || mode === 'local';
	const childrenContainerClasses = `relative z-20 flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden ${isPlayingMode ? 'pointer-events-none' : ''}`;

	return (
		<div className="bg-radial-primary flex size-full items-center justify-center overflow-hidden p-4 md:p-8">
			<div className="chamfer relative z-0 flex size-full bg-white p-[2px]">
				<div className="chamfer relative z-10 flex size-full flex-col overflow-hidden">
					{/* Game canvas - single instance managed by GameProvider */}
					<div className="absolute inset-0 z-10">
						<div className="relative h-full w-full overflow-hidden">
							<canvas ref={canvasRef} id="gameCanvas" className={canvasClasses} tabIndex={0} />
						</div>
					</div>
					<div className={`absolute top-1/2 left-0 z-15 size-fit -translate-x-[1/2.5*calc(100%)] -translate-y-1/2 -rotate-90 rounded-b-lg bg-white p-5 mix-blend-screen ${isPlayingMode ? 'pointer-events-none' : ''}`}>
						<h1 className="font-aquire text-primary text-2xl font-bold">FT_Transcendance</h1>
					</div>
					<div className={childrenContainerClasses}>
						{children}
					</div>
				</div>
			</div>

			{/* Game Result Modal - shown globally after ranked games */}
			{gameResult && (
				<GameResultModal result={gameResult} onClose={clearGameResult} />
			)}
		</div>
	);
}
