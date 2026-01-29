
import PongOnline from "../Game/PongOnline";
import PongLocal from "../Game/PongLocal";
import PongBackground from "../Game/PongBackground";

import { GameEnded } from "../globalType";
import Services from "./Services";

export type GameType = 'PongOnline' | 'PongLocal' | 'PongBackground';

class GameService {
    private static instance: GameService;

    private gameInstance: PongLocal | PongOnline | PongBackground | null = null;
    private currentGameType: GameType | null = null;

    private constructor() {
        Services.EventBus!.on("Game:Ended", this.onGameEnded);
    }

    public static getInstance(): GameService {
        if (!GameService.instance) {
            GameService.instance = new GameService();
        }
        return GameService.instance;
    }

    public isRunning(): boolean {
        if (this.gameInstance) {
            return true;
        }
        return false;
    }

    /**
     * Get the current game type.
     */
    public getCurrentGameType(): GameType | null {
        return this.currentGameType;
    }

    /**
     * Get the current game instance.
     */
    public getGameInstance(): PongLocal | PongOnline | PongBackground | null {
        return this.gameInstance;
    }

    /**
     * Launch a new game, disposing of any existing game first.
     */
    public launchGame(game: string): void {
        if (this.currentGameType === game && game === 'PongBackground') {
            return;
        }

        this.stopGame();

        if (game === "PongOnline") {
            this.currentGameType = 'PongOnline';
            this.gameInstance = new PongOnline();
            this.gameInstance.initialize();
            this.gameInstance.launch();
        }
        else if (game === "PongLocal") {
            this.currentGameType = 'PongLocal';
            this.gameInstance = new PongLocal();
            this.gameInstance.initialize();
            this.gameInstance.launch();
        }
        else if (game === 'PongBackground') {
            this.currentGameType = 'PongBackground';
            this.gameInstance = new PongBackground();
            this.gameInstance.initialize();
        }
    }

    /**
     * Start the current game (connect to server for online, start loop for others).
     */
    public startGame(): void {
        if (this.gameInstance) {
            this.gameInstance.start();
        }
    }

    /**
     * Stop and dispose of the current game.
     */
    public stopGame(): void {
        if (this.gameInstance) {
            this.gameInstance.dispose();
            this.gameInstance = null;
            this.currentGameType = null;
        }
    }

    /**
     * Switch to a different game mode.
     * This is a convenience method that stops the current game and launches a new one.
     */
    public switchMode(newGameType: GameType): void {
        if (this.currentGameType === newGameType) {
            return;
        }

        this.launchGame(newGameType);
        this.startGame();
    }

    private onGameEnded = (payload: GameEnded): void => {
        this.switchMode('PongBackground');
    }

    public dispose(): void {
        this.stopGame();
        Services.EventBus!.off("Game:Ended", this.onGameEnded);
    }
}

export default GameService;