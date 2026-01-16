
import { Vector3 } from "@babylonjs/core";
import Services from "../Services/Services.js";
import History from "../Utils/History.js";
import type { GameState, PlayerDirectionData } from "../globalType.js";
import Pong from "./Pong.js";
import InputManager from "../InputManager.js";
import Player, { LEFT } from "../Player.js";

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
        this.frameDuration = Math.floor(1000 / this.fps);
        this.lastFrameTime = services.TimeService!.getTimestamp();
        this.deltaT = 0;

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

    /*private setGameState(game: Pong, state: GameState): void {
        game.player1!.paddle.setPosition(state.p1.pos);
        game.player1!.paddle.setDirection(state.p1.dir);
        game.player2!.paddle.setPosition(state.p2.pos);
        game.player2!.paddle.setDirection(state.p2.dir);
        game.ball!.setFullPos(state.ball.pos);
        game.ball!.setDir(state.ball.dir);
        game.ball!.setSpeed(state.ball.speed);
    }*/

    // public computePlayerInputs(player: Player, inputs : PlayerDirectionData[], lastFrameTime: number, currentTime: number): void {
    //     let deltaT : number;

    //     for (let input of inputs) {
    //         deltaT = input.timestamp - lastFrameTime;
    //         player.update(deltaT);
    //         this.inputManager.setPlayerDirection(player, input);
    //         lastFrameTime = input.timestamp;
    //     }
    //     deltaT = currentTime - lastFrameTime;
    //     if (deltaT > 0)
    //         player.update(deltaT);
    //     player.paddle.model.computeWorldMatrix(true);
    // }

    public computeState(lastFrameTime: number, currentTime: number)/*: GameState*/ {
        const p1 : Player = this.game.player1!;
        const p2 : Player = this.game.player2!;
        const ball = this.game.ball!;

        let p1Inputs = this.p1InputBuffer.getStatesInRange(lastFrameTime, currentTime);
        let p2Inputs = this.p2InputBuffer.getStatesInRange(lastFrameTime, currentTime);
        
        let p1Index = 0;
        let p2Index = 0;

        let deltaT : number;

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
                ball.update(deltaT, p1.paddle, p2.paddle);
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
            ball.update(deltaT, p1.paddle, p2.paddle);
            p1.update(deltaT);
            p2.update(deltaT);
        }

        //return this.getGameState(this.game);
    }

    public async truthUpdate(): Promise<void> {
        this.services.TimeService!.update();
        const game = this.game;
        const time = this.services.TimeService!.getTimestamp();
        
        this.deltaT = time - this.lastFrameTime;

        if (this.deltaT >= this.frameDuration) {

            // let p1Inputs = this.p1InputBuffer.getStatesInRange(this.lastFrameTime, time);
            // this.computePlayerInputs(this.game.player1!, p1Inputs, this.lastFrameTime, time);

            // let p2Inputs = this.p2InputBuffer.getStatesInRange(this.lastFrameTime, time);
            // this.computePlayerInputs(this.game.player2!, p2Inputs, this.lastFrameTime, time);

            this.computeState(this.lastFrameTime, time);
            
            //game.player1!.update(this.deltaT);
            //game.player2!.update(this.deltaT);
            //game.ball!.update(this.deltaT, game.player1!.paddle, game.player2!.paddle);


            //this.game.ball!.update(this.deltaT);

            this.game.sendGameState();

            this.serverGameStateHistory.addState(this.getGameState(game));
            
            this.lastFrameTime = time;
        }
    }


    /*private lastState : GameState | null = null;
    private initialState : GameState | null = null;
    public predictionUpdate(): void {
        const game = this.game;
        const time = Services.TimeService!.getTimestamp();
        if (time > 5000)
        {
            Services.TimeService!.setTimestamp(3000);
            this.frame = 1000000;
            return;
        }
        if (this.frame >= 1000000)
        {
            let state = this.gameStateHistory.getClosestState(time);
            if (!state)
            {
                console.log("No state found at time ", time);
                return;
            }
            this.setGameState(game, state);
            return;
        }
        if (time / 16 > this.frame) {
            this.frame++;
            if (!this.lastState)
                this.lastState = this.getGameState(game);
            if (!this.initialState)
                this.initialState = this.getGameState(game);

            game.ball!.displayEffect = false;

            this.setGameState(game, this.lastState);

            game.player1!.update();
            game.player2!.update();
            game.ball!.update();

            game.ball!.displayEffect = true;
            this.gameStateHistory.addState(this.getGameState(game));
            this.lastState = this.getGameState(game);
            this.setGameState(game, this.initialState);
        }
    }*/
}

export default TruthManager;