
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
        // Don't relaunch if same game type
        if (this.currentGameType === game && game === 'PongBackground') {
            console.log(`[GameService] Game ${game} already in background mode, skipping launch`);
            return;
        }

        this.stopGame();
        console.log(`[GameService] Launching game: ${game}`);

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
            console.log(`[GameService] Starting game: ${this.currentGameType}`);
            this.gameInstance.start();
        } else {
            console.error("[GameService] No game instance to start.");
        }
    }

    /**
     * Stop and dispose of the current game.
     */
    public stopGame(): void {
        if (this.gameInstance) {
            console.log(`[GameService] Stopping game: ${this.currentGameType}`);
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
            console.log(`[GameService] Already in mode ${newGameType}, skipping switch`);
            return;
        }

        console.log(`[GameService] Switching from ${this.currentGameType} to ${newGameType}`);
        this.launchGame(newGameType);
        this.startGame();
    }

    private onGameEnded = (payload: GameEnded): void => {
        console.log("Game " + payload.name + " ended.");
        console.log("Winning player ID:", payload.winnerId);
        console.log("Final Score:", payload.score);
        // After game ends, switch back to background mode
        this.switchMode('PongBackground');
    }

    public dispose(): void {
        this.stopGame();
        Services.EventBus!.off("Game:Ended", this.onGameEnded);
    }
}

export default GameService;