
import { Vector3 } from "@babylonjs/core";
import Services from "../Services/Services";
import History from "../Utils/History";
import type { GameState, PlayerDirectionData } from "../globalType";
import PongOnline from "./PongOnline";
import Player, { NONE } from "../Player";
import InputManager from "../InputManagerOnline";


class PredictionManager {
    private game: PongOnline;

    private clientGameStateHistory: History<GameState>;
    private serverGameStateHistory: History<GameState>;

    private inputManager: InputManager;
    private playerInputBuffer: History<PlayerDirectionData>;

    private fps: number;
    private frameDuration: number;
    private lastFrameTime: number;
    private deltaT: number;

    constructor(game: PongOnline) {
        this.game = game;
        this.inputManager = this.game.inputManager!;
        this.playerInputBuffer = this.inputManager.getInputBuffer();

        this.clientGameStateHistory = new History<GameState>(120);
        this.serverGameStateHistory = new History<GameState>(120);

        this.fps = 60;
        this.frameDuration = Math.floor(1000 / this.fps);
        this.lastFrameTime = Services.TimeService!.getTimestamp();
        this.deltaT = 0;

    }

    resetLastFrameTime(): void {
        this.lastFrameTime = Services.TimeService!.getTimestamp();
    }

    private getGameState(game: PongOnline): GameState {
        return {
            timestamp: Services.TimeService!.getTimestamp(),
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
                speed: game.ball!.getSpeed(),
                moving: game.ball!.isMoving()
            }
        };
    }

    private setGameState(game: PongOnline, state: GameState): void {
        game.player1!.paddle.setFullPosition(state.p1.pos);
        game.player1!.paddle.setDirection(state.p1.dir); //a voir

        game.player2!.paddle.setFullPosition(state.p2.pos);
        game.player2!.paddle.setDirection(state.p2.dir); // a voir

        game.ball!.setPos(state.ball.pos);
        game.ball!.setFullDir(state.ball.dir);
        game.ball!.setSpeed(state.ball.speed);
    }


    /*public computeState(baseFrame: GameState, currentTime: number): GameState {
        const deltaT = currentTime - baseFrame.timestamp;

        this.setGameState(this.game, baseFrame);
        this.game.ball!.displayEffect = false;
        this.game.player1!.update(deltaT);
        this.game.player2!.update(deltaT);
        this.game.ball!.update(deltaT);
        this.game.ball!.displayEffect = true;

        return this.getGameState(this.game);
    }*/

    public reconcileStates(prediction: GameState, truth: GameState): void {
        const posDiffP1 = prediction.p1.pos.subtract(truth.p1.pos).length();
        const posDiffP2 = prediction.p2.pos.subtract(truth.p2.pos).length();
        const posDiffBall = prediction.ball.pos.subtract(truth.ball.pos).length();
        const dirDiffBall = prediction.ball.dir.subtract(truth.ball.dir).length();
        const speedDiffBall = Math.abs(prediction.ball.speed - truth.ball.speed);

        if (posDiffP1 > 0.1) {
            console.log(`Player 1 position prediction error: ${posDiffP1}`);
            //console.log("Truth pos:", truth.p1.pos, " Predicted pos:", prediction.p1.pos);
            this.game.player1!.paddle.reconcile(prediction.p1.pos, truth.p1.pos);
        }
        if (posDiffP2 > 0.1) {
            this.game.player2!.paddle.reconcile(prediction.p2.pos, truth.p2.pos);
            console.log(`Player 2 position prediction error: ${posDiffP2}`);
        }
        if (posDiffBall > 0.1 || dirDiffBall > 0.1 || speedDiffBall > 0.1) {
            console.warn(`⚠️ RECONCILIATION BALL predicted : ${prediction.ball.pos} real : ${truth.ball.pos} ⚠️`);
            console.log(`- Pos Diff: ${posDiffBall.toFixed(4)} ${posDiffBall > 0.1 ? '❌' : '✅'}`);
            console.log(`- Dir Diff: ${dirDiffBall.toFixed(4)} ${dirDiffBall > 0.1 ? '❌' : '✅'}`);
            console.log(`- Spd Diff: ${speedDiffBall.toFixed(4)} ${speedDiffBall > 0.1 ? '❌' : '✅'}`);
            this.game.ball!.reconcile(prediction.ball.pos, truth.ball.pos, truth.ball.dir, truth.ball.speed);
        }
    }

    public computeState(baseFrame: GameState, player: Player, lastFrameTime: number, currentTime: number): GameState {
        this.setGameState(this.game, baseFrame);
        const ball = this.game.ball!;

        //console.log("Truth Ball pos:", ball.getPosition());
        let p1Inputs = this.playerInputBuffer.getStatesInRange(lastFrameTime, currentTime);
        let p1Index = 0;

        let deltaT: number;

        let firstInput = this.playerInputBuffer.getClosestState(lastFrameTime, 3000);
        if (firstInput) {
            this.inputManager.setPlayerDirection(player, firstInput, false);
        }
        else {
            this.inputManager.setPlayerDirection(player, { timestamp: lastFrameTime, direction: NONE }, false);
        }

        const ballStartTime = ball.getStartMovingTime();

        let ballEventPending = (ballStartTime > lastFrameTime && ballStartTime <= currentTime);
        while (p1Index < p1Inputs.length || ballEventPending) {

            const p1NextInput = p1Inputs[p1Index];

            let nextEventTime = currentTime;
            let processP1 = false;
            let processBall = false;

            if (ballEventPending) {
                if (p1NextInput && p1NextInput.timestamp < ballStartTime) {
                    nextEventTime = p1NextInput.timestamp;
                    processP1 = true;
                }
                else if (p1NextInput && p1NextInput.timestamp === ballStartTime) {
                    nextEventTime = ballStartTime;
                    processBall = true;
                    processP1 = true;
                }
                else {
                    nextEventTime = ballStartTime;
                    processBall = true;
                }
            }
            else if (p1NextInput) {
                nextEventTime = p1NextInput.timestamp;
                processP1 = true;
            }

            deltaT = nextEventTime - lastFrameTime;

            if (deltaT > 0) {
                ball.update(nextEventTime, deltaT, this.game.player1!.paddle, this.game.player2!.paddle);
                player.update(deltaT);
                //console.log("1 call HERE to start the ball");
                //console.log("Ball pos before update :", ball.getPosition());
                //console.log("Ball pos after update :", ball.getPosition());
            }

            if (processP1) {
                this.inputManager.setPlayerDirection(player, p1Inputs[p1Index]!, false);
                p1Index++;
            }
            if (processBall) {
                ball.setMoving(true);
                ballEventPending = false;
            }

            lastFrameTime = nextEventTime;
        }

        deltaT = currentTime - lastFrameTime;
        if (deltaT > 0) {
            ball.update(currentTime, deltaT, this.game.player1!.paddle, this.game.player2!.paddle);
            player.update(deltaT);
            //console.log("1 call HERE to make it right");
            //console.log("Ball pos before final update :", ball.getPosition());
            //console.log("Ball pos after final update :", ball.getPosition());
        }
        //console.log("Truth Ball pos after computing :", ball.getPosition());
        //console.log("================================");
        return this.getGameState(this.game);
    }

    //private test :boolean = false;
    public async predictionUpdate(): Promise<void> {
        Services.TimeService!.update();
        const game = this.game;
        const time = Services.TimeService!.getTimestamp();

        this.deltaT = time - this.lastFrameTime;
        if (this.deltaT >= this.frameDuration) {

            this.inputManager.processLastInputs(this.game.clientPlayer!);
            const latestPlayerDirection = this.playerInputBuffer.getLatestState();
            if (latestPlayerDirection && latestPlayerDirection.timestamp > this.lastFrameTime && latestPlayerDirection.timestamp <= time) {
                latestPlayerDirection.timestamp = time - Services.TimeService!.getDeltaTime();
                this.inputManager.setPlayerDirection(this.game.clientPlayer!, latestPlayerDirection, true);
            }

            //console.log("Prediction Ball pos:", game.ball!.getPosition());
            game.ball!.update(time, Services.TimeService!.getDeltaTime(), game.player1!.paddle, game.player2!.paddle);
            game.player1!.update(Services.TimeService!.getDeltaTime());
            game.player2!.update(Services.TimeService!.getDeltaTime());

            //console.log("After update Ball pos:", game.ball!.getPosition());
            let predictionState = this.getGameState(game);

            let latestServerState = this.serverGameStateHistory.getLatestState();
            if (latestServerState) {
                game.ball!.displayEffect = false;
                //console.log("COMPUTE at time : ", time);
                let truthState = this.computeState(latestServerState, this.game.clientPlayer!, latestServerState.timestamp, time);
                //console.log("RECONCILE : ")
                this.reconcileStates(predictionState, truthState);
                game.ball!.displayEffect = true;
            }

            //this.setGameState(game, predictionState);

            // if (latestServerState)
            // {
            //     this.setGameState(game, latestServerState);
            // }

            //this.clientGameStateHistory.addState(this.getGameState(game));

            this.lastFrameTime = time;
        }
        else {
            game.ball!.update(time, Services.TimeService!.getDeltaTime(), game.player1!.paddle, game.player2!.paddle);
            game.player1!.update(Services.TimeService!.getDeltaTime());
            game.player2!.update(Services.TimeService!.getDeltaTime());
        }
        game.ball!.render();
        game.player1!.paddle.render();
        game.player2!.paddle.render();
    }


    public onServerGameStateReceived(state: any): void {
        const parsedState: GameState = {
            timestamp: state.timestamp,
            p1: {
                pos: new Vector3(state.p1.pos._x, state.p1.pos._y, state.p1.pos._z),
                dir: new Vector3(state.p1.dir._x, state.p1.dir._y, state.p1.dir._z)
            },
            p2: {
                pos: new Vector3(state.p2.pos._x, state.p2.pos._y, state.p2.pos._z),
                dir: new Vector3(state.p2.dir._x, state.p2.dir._y, state.p2.dir._z)
            },
            ball: {
                pos: new Vector3(state.ball.pos._x, state.ball.pos._y, state.ball.pos._z),
                dir: new Vector3(state.ball.dir._x, state.ball.dir._y, state.ball.dir._z),
                speed: state.ball.speed,
                moving: state.ball.moving
            }
        };
        this.serverGameStateHistory.addState(parsedState);
    }

}

export default PredictionManager;