
import PongOnline from "../Game/PongOnline";
import PongLocal from "../Game/PongLocal";
import PongBackground from "../Game/PongBackground";

import { GameEnded } from "../globalType";
import Services from "./Services";

class GameService {
    private static instance: GameService;

    private gameInstance: PongLocal | PongOnline | PongBackground | null = null;

    private constructor() {
        Services.EventBus!.on("Game:Ended", this.onGameEnded);
    }

    public static getInstance(): GameService {
        if (!GameService.instance) {
            GameService.instance = new GameService();
        }
        return GameService.instance;
    }

    public launchGame(game : String): void {
        this.stopGame();
        if (game === "PongOnline") {
            this.gameInstance = new PongOnline();
            this.gameInstance.initialize();
            this.gameInstance.launch();
        }
        else if (game === "PongLocal") {
            this.gameInstance = new PongLocal();
            this.gameInstance.initialize();
            this.gameInstance.launch();
        }
        else if (game === 'PongBackground') {
			// Create background game (AI vs AI, no gameId needed)
			this.gameInstance = new PongBackground();
			this.gameInstance.initialize();
		}
    }

    public startGame(): void {
        if (this.gameInstance) {
            this.gameInstance.start();
        } else
            console.error("GameService: No game instance to join.");
    }

    public stopGame(): void {
        if (this.gameInstance) {
            this.gameInstance.dispose();
            this.gameInstance = null;
        }
    }

    private onGameEnded = (payload: GameEnded): void => {
        console.log("Game " + payload.name + " ended.");
        console.log("Winning player ID:", payload.winnerId);
        console.log("Final Score:", payload.score);
        this.launchGame(payload.name);
    }

    public dispose(): void {
        Services.EventBus!.off("Game:Ended", this.onGameEnded);
    }
}

export default GameService;