import { useContext } from 'my-react';
import { GameContext, GameContextType } from '../context/gameContext';

export function useGame(): GameContextType {
	const context = useContext(GameContext);

	if (!context) {
		throw new Error('useGame must be used within a GameProvider');
	}

	return context as GameContextType;
}

export default useGame;

