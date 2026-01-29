import Services from "../Services/Services.js";
import History from "../Utils/History.js";
import type { GameState, PlayerDirectionData } from "../globalType.js";
import Pong from "./Pong.js";
import InputManager from "../InputManager.js";
import Player from "../Player.js";

class TruthManager {
    private game: Pong;
    private services: Services;
    private inputManager: InputManager;

    private serverGameStateHistory: History<GameState>;
    private p1InputBuffer: History<PlayerDirectionData>;
    private p2InputBuffer: History<PlayerDirectionData>;

    private fps: number;
    private frameDuration: number;
    private lastFrameTime: number;
    private deltaT: number;

    constructor(services: Services, game: Pong) {
        this.game = game;
        this.inputManager = this.game.inputManager!;
        this.p1InputBuffer = this.inputManager.getP1InputBuffer();
        this.p2InputBuffer = this.inputManager.getP2InputBuffer();

        this.services = services;
        this.serverGameStateHistory = new History<GameState>(60);

        this.fps = 30;
        this.frameDuration = Math.floor(1000 / this.fps - 1);
        this.lastFrameTime = services.TimeService!.getTimestamp();
        this.deltaT = 0;
    }

    resetLastFrameTime(): void {
        this.lastFrameTime = this.services.TimeService!.getTimestamp();
    }

    private getGameState(game: Pong): GameState {
        return {
            timestamp: this.services.TimeService!.getTimestamp(),
            p1: {
                pos: game.player1!.paddle.getPosition(),
                dir: game.player1!.paddle.getDirection()
            },
            p2: {
                pos: game.player2!.paddle.getPosition(),
                dir: game.player2!.paddle.getDirection()
            },
            ball: {
                pos: game.ball!.getPosition(),
                dir: game.ball!.getDirection(),
                speed: game.ball!.getSpeed()
            }
        };
    }

    public computeState(lastFrameTime: number, currentTime: number)/*: GameState*/ {
        const p1: Player = this.game.player1!;
        const p2: Player = this.game.player2!;
        const ball = this.game.ball!;

        let p1Inputs = this.p1InputBuffer.getStatesInRange(lastFrameTime, currentTime);
        let p2Inputs = this.p2InputBuffer.getStatesInRange(lastFrameTime, currentTime);

        let p1Index = 0;
        let p2Index = 0;

        let deltaT: number;

        while (p1Index < p1Inputs.length || p2Index < p2Inputs.length) {
            const p1NextInput = p1Inputs[p1Index];
            const p2NextInput = p2Inputs[p2Index];

            let nextEventTime = currentTime;
            let processP1 = false;
            let processP2 = false;

            if (p1NextInput && p2NextInput) {
                if (p1NextInput.timestamp < p2NextInput.timestamp) {
                    nextEventTime = p1NextInput.timestamp;
                    processP1 = true;
                }
                else if (p1NextInput.timestamp > p2NextInput.timestamp) {
                    nextEventTime = p2NextInput.timestamp;
                    processP2 = true;
                }
                else {
                    nextEventTime = p1NextInput.timestamp;
                    processP1 = true;
                    processP2 = true;
                }
            }
            else if (p1NextInput) {
                nextEventTime = p1NextInput.timestamp;
                processP1 = true;
            }
            else if (p2NextInput) {
                nextEventTime = p2NextInput.timestamp;
                processP2 = true;
            }

            deltaT = nextEventTime - lastFrameTime;

            if (deltaT > 0) {
                ball.update(nextEventTime, deltaT, p1.paddle, p2.paddle);
                p1.update(deltaT);
                p2.update(deltaT);
            }

            if (processP1) {
                this.inputManager.setPlayerDirection(p1, p1Inputs[p1Index]!);
                p1Index++;
            }
            if (processP2) {
                this.inputManager.setPlayerDirection(p2, p2Inputs[p2Index]!);
                p2Index++;
            }

            lastFrameTime = nextEventTime;
        }

        deltaT = currentTime - lastFrameTime;
        if (deltaT > 0) {
            ball.update(currentTime, deltaT, p1.paddle, p2.paddle);
            p1.update(deltaT);
            p2.update(deltaT);
        }
    }

    public async truthUpdate(): Promise<void> {
        this.services.TimeService!.update();
        const game = this.game;
        const time = this.services.TimeService!.getTimestamp();

        this.deltaT = time - this.lastFrameTime;

        if (this.deltaT >= this.frameDuration) {
            this.computeState(this.lastFrameTime, time);
            this.game.sendGameState();
            this.serverGameStateHistory.addState(this.getGameState(game));
            this.lastFrameTime = time;
            if (time > 300000) {
                this.game.endGame('timeout');
            }
        }
    }
}

export default TruthManager;