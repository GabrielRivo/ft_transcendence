import { Scene, MeshBuilder, StandardMaterial, Color3, ArcRotateCamera, Vector2, Vector3, GlowLayer, Mesh, SetValueAction, Camera, PBRMaterial } from "@babylonjs/core";
import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";

import Services from "../Services/Services";
import type { DeathBarPayload, GameState, OwnedMesh } from "../globalType";
import Player from "../Player";
import DeathBar from "../DeathBar";
import Ball from "../Ball";
import Wall from "../Wall";
import PredictionManager from "./PredictionManager";
import Game from "./Game";

import { gameSocket as socket } from "../../../socket";
import InputManagerOnline from "../InputManagerOnline";
import ZoomEffect from "../Effects/ZoomEffect";
import BlackScreenEffect from "../Effects/BlackScreenEffect";
import RotateCameraAlphaEffect from "../Effects/RotateCameraAlphaEffect";
import CameraShakeEffect from "../Effects/CameraShakeEffect";
import LightUpEffect from "../Effects/LightUpEffect";
import Paddle from "../Paddle";


class PongOnline extends Game {

    inputManager?: InputManagerOnline;
    predictionManager?: PredictionManager;
    player1?: Player;
    player2?: Player;
    clientPlayer?: Player;
    ball?: Ball;
    walls?: Wall[];
    width: number = 7;
    height: number = 12;
    camera?: ArcRotateCamera;

    private currentGameState: "waiting" | "playing" | null;
    private gameState: "waiting" | "playing" | null;
    private serverState: "connected" | "disconnected";
    private gameJoined: boolean = false;

    private isDisposed: boolean = false;
    private glowLayer?: GlowLayer;

    private connectionTimeoutId?: NodeJS.Timeout;

    private cameraAnimating: boolean = false;

    constructor() {
        super();
        this.currentGameState = null;
        this.gameState = null;
        this.serverState = "disconnected";
    }

    initialize(): void {
        Services.TimeService!.initialize();
        Services.Scene = new Scene(Services.Engine!);
        Services.Dimensions = new Vector2(this.width, this.height);
        window.addEventListener("keydown", this.showDebugLayer);

        this.inputManager = new InputManagerOnline(this);
        this.predictionManager = new PredictionManager(this);

        Services.EventBus!.on("DeathBarHit", this.onDeathBarHit);
        Services.EventBus!.on("BallBounce", this.onBallBounce);
        Services.EventBus!.on("PaddleHitBall", this.onPaddleHitBall);

        this.drawScene();
    }

    drawScene(): void {
        if (this.isDisposed || !Services.Scene) return;

        this.camera = new ArcRotateCamera("Camera", 0, Math.PI / 2.8, 22, Vector3.Zero(), Services.Scene);

        this.camera.inputs.attached.mousewheel.detachControl();

        const blackScreen = new BlackScreenEffect(1, 0);
        blackScreen.play();

        this.glowLayer = new GlowLayer("glow", Services.Scene, {
            blurKernelSize: 32,
            mainTextureRatio: 0.25
        });
        this.glowLayer.intensity = 0.3;

        this.player1 = new Player(1);
        this.player2 = new Player(2);
        if (this.isDisposed || !Services.Scene) return;
        this.ball = new Ball();
        this.walls = [new Wall(), new Wall()];
        this.walls.forEach(wall => Services.Scene!.addMesh(wall.model));

        const ground = MeshBuilder.CreateBox("ground", { width: this.width, height: this.height, depth: 0.1 }, Services.Scene);
        ground.position = new Vector3(0, -0.05, 0);
        ground.rotate(Vector3.Right(), Math.PI / 2);
        ground.isPickable = false;

        const groundMaterial = new StandardMaterial("groundMat", Services.Scene);
        groundMaterial.diffuseColor = new Color3(0.4, 0.4, 0.4);
        ground.material = groundMaterial;

        this.ball.setPos(new Vector3(0, -100, 0));
        this.ball.setModelPos(this.ball.position);

        this.player1.paddle.setHitboxDirection(new Vector3(0, 0, 1));
        this.player2.paddle.setHitboxDirection(new Vector3(0, 0, -1));

        this.player1.paddle.setFullPosition(new Vector3(0, 0.15, -this.height / 2 + 2));
        this.player2.paddle.setFullPosition(new Vector3(0, 0.15, this.height / 2 - 2));

        this.player1.paddle.setModelDirection(new Vector3(0, 0, 1));
        this.player2.paddle.setModelDirection(new Vector3(0, 0, -1));

        this.player1.paddle.setModelPosition(new Vector3(0, 0.15, -this.height / 2 + 2));
        this.player2.paddle.setModelPosition(new Vector3(0, 0.15, this.height / 2 - 2));

        this.player1.paddle.setTrigger1Position(new Vector3(0, 0.15, -this.height / 2 + 2));
        this.player2.paddle.setTrigger1Position(new Vector3(0, 0.15, this.height / 2 - 2));

        this.player1.paddle.setTrigger2Position(new Vector3(0, 0.15, -this.height / 2 + 2 - 0.075));
        this.player2.paddle.setTrigger2Position(new Vector3(0, 0.15, this.height / 2 - 2 + 0.075));

        this.player1.paddle.setTrigger3Position(new Vector3(0, 0.15, -this.height / 2 + 2 - 0.15));
        this.player2.paddle.setTrigger3Position(new Vector3(0, 0.15, this.height / 2 - 2 + 0.15));

        this.player1.deathBar.model.position = new Vector3(0, 0.125, -this.height / 2 + 1);
        this.player2.deathBar.model.position = new Vector3(0, 0.125, this.height / 2 - 1);
        this.walls[0].model.position = new Vector3(-this.width / 2 - 0.1, 0.25, 0);
        this.walls[1].model.position = new Vector3(this.width / 2 + 0.1, 0.25, 0);

        this.loadGameAssets();
    }

    async loadGameAssets(): Promise<void> {
        // Load 3D background model from cache
        if (this.isDisposed || !Services.Scene) return;
        try {
            const meshes = await Services.AssetCache.loadModel('pong-background', '/models/pong.glb', Services.Scene);
            if (this.isDisposed) return; // Check again after async operation
            meshes.forEach(mesh => {
                mesh.isPickable = false;
            });
        } catch (e) {
            if (!this.isDisposed) {
                console.error('[PongOnline] Failed to load pong.glb:', e);
            }
        }
        let ballMesh: Mesh | undefined = undefined;
        if (this.isDisposed || !Services.Scene) return;
        try {
            const ballMeshs = await Services.AssetCache.loadModel('pong-ball', '/models/ball.glb', Services.Scene);
            if (this.isDisposed) return; // Check again after async operation
            ballMeshs.forEach(mesh => {
                mesh.isPickable = false;
            });
            ballMesh = ballMeshs[0]! as Mesh;
        } catch (e) {
            if (!this.isDisposed) {
                console.error('[PongOnline] Failed to load pong.glb:', e);
            }
        }
        if (this.isDisposed || !Services.Scene) return;
        if (ballMesh && this.ball) {
            this.ball.setModelMesh(ballMesh);
        }
    }

    launch(): void {
        this.stop();
    }

    start(): void {
        this.joinServer();
    }

    joinServer(): void {
        socket.on("connect_error", this.onServerLostConnection);
        socket.on("disconnect", this.onServerLostConnection);
        socket.on("queueTimeout", this.onGameEnded);
        socket.on("gameJoined", this.onGameJoined);
        socket.on("gameStopped", this.onGameStopped);
        socket.on("gameStarted", this.onGameStarted);
        socket.on("gameEnded", this.onGameEnded);
        socket.on("gameUpdate", this.onGameUpdate);
        socket.on("generateBall", this.onGenerateBall);
        socket.on("score", this.onScore);
        socket.onAny(this.onServerLog);


        socket.once("connect", () => {
            console.log("Connected to server, starting Pong game.");
            this.serverState = "connected";
            this.processGameState();
        });

        socket.connect();
    }

    public pingServer(): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const time = performance.now();

            socket.emit("ping");
            const timeoutId = setTimeout(() => {
                console.log("Ping timeout");
                socket.off("pong", onPong);
                return reject("Ping timeout");
            }, 1000);
            const onPong = () => {
                console.log(`Ping: ${performance.now() - time} ms`);
                clearTimeout(timeoutId);
                return resolve(performance.now() - time);
            };
            socket.once("pong", onPong);
        });
    }

    public async measureLatency(): Promise<number> {
        const attempts = 5;
        const validPings: number[] = [];

        for (let i = 0; i < attempts; i++) {
            try {
                if (i > 0) await new Promise(r => setTimeout(r, 100));

                const p = await this.pingServer();
                validPings.push(p);

            } catch (error) {
                console.warn(`Ping number ${i + 1}/${attempts} failed.`);
            }
        }

        if (validPings.length === 0) {
            throw new Error("Unable to measure latency: All pings failed.");
        }

        const sum = validPings.reduce((a, b) => a + b, 0);
        const average = Math.round(sum / validPings.length);

        console.log(`Measured latency: ${average} ms (over ${validPings.length} successful attempts)`);
        return average;
    }

    public async synchronizeTimeWithServer(serverTimestamp: number): Promise<void> {
        try {
            const timeAheadOfServ = 50;
            let measuringTime = performance.now();
            const latency: number = await this.measureLatency();
            measuringTime = performance.now() - measuringTime;
            console.log(`Time taken to measure latency: ${measuringTime} ms`);
            Services.TimeService!.initialize();
            Services.TimeService!.setTimestamp(serverTimestamp + (latency / 2) + measuringTime + timeAheadOfServ);
            console.log("Time synchronized to:", serverTimestamp, " ahead by ", timeAheadOfServ, " with latency compensation of", latency / 2, "ms. New timestamp:", Services.TimeService!.getTimestamp());
        } catch (error) {
            console.error("Error synchronizing time with server:", error);
            this.onServerLostConnection();
        }
        socket.once("latencyTest", (payload: any) => {
            Services.TimeService!.update();
            const clienttime = Services.TimeService!.getTimestamp();
            console.log("Latency test from server:", payload);
            console.log("Current client timestamp:", clienttime, " with a real timestamp of ", Services.TimeService!.getRealTimestamp(), " difference : ", clienttime - payload.timestamp);
        });
    }

    private onServerLostConnection = (): void => {
        socket.off("connect_error", this.onServerLostConnection);
        socket.off("disconnect", this.onServerLostConnection);

        console.log("Lost connection to server, attempting to reconnect...");
        this.serverState = "disconnected";
        //this.gameJoined = false;
        this.gameState = "waiting";
        this.processGameState();
        //let connectionTimeout;

        this.connectionTimeoutId = setTimeout(() => {
            this.endGame();
        }, 8000);
        socket.once("connect", () => {
            console.log("Reconnected to server, resuming game.");
            clearTimeout(this.connectionTimeoutId);
            socket.on("connect_error", this.onServerLostConnection);
            socket.on("disconnect", this.onServerLostConnection);
            console.log("Resuming game after reconnection.");
            this.serverState = "connected";
            //this.processGameState();
        });
    }

    private tournamentId?: string;
    private gameType?: string;

    private onGameJoined = (payload: any): void => {

        console.log("Game joined with payload:", payload, " timestamp:", performance.now());
        if (payload.gameType) {
            this.gameType = payload.gameType;
            console.log("Game type received:", this.gameType);
        }
        if (payload.tournamentId) {
            this.tournamentId = payload.tournamentId;
            console.log("Tournament ID received:", this.tournamentId);
        }
        if (!this.gameJoined) {
            this.camera!.attachControl(Services.Canvas, true);
            this.camera!.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
            this.camera!.lowerRadiusLimit = 8;
            this.camera!.upperRadiusLimit = 22;
            this.camera!.wheelDeltaPercentage = 0.01;
            this.camera!.upperBetaLimit = Math.PI / 1.6;
            this.camera!._panningMouseButton = -1;
            this.camera!.beta = Math.PI / 2.8;
            const zoomEffect = new ZoomEffect(22, 11);
            let rotateCameraAlphaEffect: RotateCameraAlphaEffect;
            if (payload.player === 1) {
                this.clientPlayer = this.player1;
                this.inputManager!.listenToPlayer1();
                //this.camera!.alpha = -Math.PI/2;
                rotateCameraAlphaEffect = new RotateCameraAlphaEffect(-Math.PI / 2);
            } else {
                this.clientPlayer = this.player2;
                this.inputManager!.listenToPlayer2();
                //this.camera!.alpha = Math.PI/2;
                rotateCameraAlphaEffect = new RotateCameraAlphaEffect(Math.PI / 2);
            }
            Services.Scene!.stopAnimation(this.camera!);
            this.cameraAnimating = true;
            rotateCameraAlphaEffect.play(this.camera!);
            zoomEffect.play(this.camera!);

            setTimeout(() => {
                this.cameraAnimating = false;
            }, 1700);

            Services.EventBus!.emit("Game:ScoreUpdated", { player1Score: payload.player1Score, player2Score: payload.player2Score, scoreToWin: 5 });

            this.gameJoined = true;
        }
        this.processGameState();
    }

    private onGameStopped = (payload: any): void => {
        this.gameState = "waiting";
        this.processGameState();
    }

    private onGameStarted = (payload: any): void => {
        this.gameState = "playing";
        console.log("Game started by server with payload:", payload, " timestamp:", performance.now());
        this.synchronizeTimeWithServer(payload.timestamp);
        this.processGameState();
    }

    private onGameEnded = (payload: any): void => {
        console.log("Game ended by server:", payload);
        this.endGame();
    }

    private onServerLog = (event: string, ...args: any[]): void => {
        //console.log(`LOG SOCKET FROM SERVER: ${event}`, ...args);
    }

    private onGameUpdate = (payload: any): void => {
        this.predictionManager!.onServerGameStateReceived(payload);
    }

    private onGenerateBall = (payload: any): void => {
        if (!this.ball) return;
        const time = Services.TimeService!.getTimestamp();
        const deltaT = time - payload.timestamp;
        this.ball.generate(2000 - deltaT, payload.ballDirection);
    }

    private onScore = (payload: any): void => {
        const cameraShake = new CameraShakeEffect(0.3, 50);
        const lightUpPillar = new LightUpEffect(0.05, 125);

        let pillarColor: Color3;
        if (payload.scoringPlayer === 1)
            //pillarColor = new Color3(0.8, 0, 0.8);
            pillarColor = new Color3(0.2, 0.8, 1);
        else
            pillarColor = new Color3(0.8, 0.3, 0.8);

        cameraShake.play(this.camera!);
        lightUpPillar.play(Services.Scene!.getMaterialByName("PillarTop") as PBRMaterial, pillarColor);
        console.log("Score update from server:", payload);
        this.player1!.setScore(payload.player1Score);
        this.player2!.setScore(payload.player2Score);
        Services.EventBus!.emit("Game:ScoreUpdated", { player1Score: this.player1!.score, player2Score: this.player2!.score, scoreToWin: 5 });

        if (this.player1!.score == 5 || this.player2!.score == 5) {
            console.log("Game over detected from score update.");
        }
    }

    private onBallBounce = (payload: any): void => {
        if (this.cameraAnimating) return;
        const modifier = payload.ball.getSpeed() / 3;
        const duration = 15;
        const magnitude = 0.02 + 0.035 * modifier;
        const cameraShake = new CameraShakeEffect(magnitude, duration);
        cameraShake.play(this.camera!);
    }

    private onPaddleHitBall = (payload: any): void => {
        if (this.cameraAnimating) return;
        const modifier = payload.ball.getSpeed() / 3;
        const duration = 25;
        const magnitude = 0.03 + 0.055 * modifier;
        const cameraShake = new CameraShakeEffect(magnitude, duration);
        cameraShake.play(this.camera!);
    }

    private onDeathBarHit = (payload: DeathBarPayload) => {
        /*if (payload.deathBar.owner == this.player1) {
            this.player2!.scoreUp();
            Services.EventBus!.emit("Game:ScoreUpdated", { player1Score: this.player1!.score, player2Score: this.player2!.score, scoreToWin: 5 });
            console.log("Player 2 score :", this.player2!.score);
        }
        else if (payload.deathBar.owner == this.player2) {
            this.player1!.scoreUp();
            Services.EventBus!.emit("Game:ScoreUpdated", { player1Score: this.player1!.score, player2Score: this.player2!.score, scoreToWin: 5 });
            console.log("Player 1 score :", this.player1!.score);
        }*/
        this.ball!.setPos(new Vector3(0, -100, 0));
        this.ball!.setModelPos(this.ball!.position);
        //this.ball = new Ball();
        //this.ball.setFullPos(new Vector3(0, 0.125, 0));
    }

    processGameState(): void {
        if (this.serverState === "connected" && this.gameState === "playing" && this.currentGameState !== "playing") {
            Services.EventBus!.emit("UI:MenuStateChange", "off");
            this.currentGameState = "playing";
            if (this.gameJoined === false) {
                console.log("Game state is playing but gameJoined is false. Setting clientPlayer to player1 by default.");
                this.clientPlayer = this.player1;
            }
            this.run();
        }
        else if (this.currentGameState !== "waiting") {
            if (this.gameJoined === false && this.serverState === "connected") {
                Services.EventBus!.emit("UI:MenuStateChange", "matchmaking");
            }
            else
                Services.EventBus!.emit("UI:MenuStateChange", "loading");
            this.currentGameState = "waiting";
            this.stop();
        }
    }

    run() {
        console.log("Game running.");
        this.isDisposed = false;
        Services.TimeService!.update();
        this.predictionManager!.resetLastFrameTime();
        Services.Engine!.stopRenderLoop(this.stoppedRenderLoop);
        Services.Engine!.runRenderLoop(this.renderLoop);
    }

    private lastPingTime: number = 0;
    private renderLoop = () => {
        //console.log("renderLoop online");
        if (this.isDisposed) return;
        this.predictionManager!.predictionUpdate();

        if (Services.TimeService!.getTimestamp() - this.lastPingTime > 5000) {
            try {
                this.pingServer().then((result) => {
                    Services.EventBus!.emit("Game:LatencyUpdate", result);
                });
            } catch (error) {
                console.warn("Error pinging server:", error);
                Services.EventBus!.emit("Game:LatencyUpdate", 999);
            }
            this.lastPingTime = Services.TimeService!.getTimestamp();
        }
        // this.player1!.update();
        // this.player2!.update();
        // this.ball!.update();
        Services.Scene!.render();
    }

    stop() {
        console.log("Game stopped.");
        Services.Engine!.stopRenderLoop(this.renderLoop);
        Services.Engine!.runRenderLoop(this.stoppedRenderLoop);
    }

    stoppedRenderLoop = () => {
        if (this.isDisposed) return;
        Services.Scene!.render();
    }

    private endGame(): void {
        //Services.EventBus!.emit("UI:MenuStateChange", "pongMenu");
        if (!this.tournamentId) {
            const blackScreen = new BlackScreenEffect(0, 1);
            blackScreen.play();
        }

        setTimeout(() => {
            Services.EventBus!.emit("Game:Ended", {
                name: "PongOnline",
                winnerId: null,
                score: { player1: this.player1!.score, player2: this.player2!.score },
                gameType: this.gameType,
                tournamentId: this.tournamentId
            });
        }, this.tournamentId ? 0 : 1000);
        //this.dispose();
    }

    dispose(): void {
        console.log("Disposing Pong game instance.");
        this.isDisposed = true;

        this.connectionTimeoutId && clearTimeout(this.connectionTimeoutId);

        Services.Engine!.stopRenderLoop(this.renderLoop);
        Services.Engine!.stopRenderLoop(this.stoppedRenderLoop);
        Services.Engine!.stopRenderLoop();

        // Dispose glow layer first to avoid postProcessManager errors
        this.glowLayer?.dispose();
        this.glowLayer = undefined;

        this.player1?.dispose();
        this.player2?.dispose();
        this.ball?.dispose();
        this.walls?.forEach(wall => wall.dispose());
        this.inputManager?.dispose();
        Services.EventBus!.off("DeathBarHit", this.onDeathBarHit);
        Services.EventBus!.off("BallBounce", this.onBallBounce);
        Services.EventBus!.off("PaddleHitBall", this.onPaddleHitBall);
        socket.off("connect");
        socket.off("connect_error", this.onServerLostConnection);
        socket.off("disconnect", this.onServerLostConnection);
        socket.off("queueTimeout", this.onGameEnded);
        socket.off("gameJoined", this.onGameJoined);
        socket.off("gameStopped", this.onGameStopped);
        socket.off("gameStarted", this.onGameStarted);
        socket.off("gameEnded", this.onGameEnded);
        socket.off("gameUpdate", this.onGameUpdate);
        socket.off("generateBall", this.onGenerateBall);
        socket.off("score", this.onScore);
        socket.offAny(this.onServerLog);
        socket.disconnect();

        Services.Scene?.stopAllAnimations();
        this.camera?.detachControl();
        this.camera?.dispose();
        Services.Scene?.dispose();

        this.camera = undefined;
        Services.Scene = undefined;
        Services.Dimensions = undefined;

        window.removeEventListener("keydown", this.showDebugLayer);
    }

    showDebugLayer(ev: KeyboardEvent) {
        if (ev.ctrlKey && ev.key.toLowerCase() === 'i') {
            ev.preventDefault();

            if (Services.Scene!.debugLayer.isVisible()) {
                Services.Scene!.debugLayer.hide();
            } else {
                Services.Scene!.debugLayer.show().catch((err) => {
                    console.error("Impossible to launch the inspector.", err);
                });
            }
        }
    }
}

export default PongOnline;