import { Scene, MeshBuilder, StandardMaterial, Color3, ArcRotateCamera, Vector2, Vector3, GlowLayer } from "@babylonjs/core";
import Services from "../Services/Services";
import { DeathBarPayload } from "../globalType";
import Player from "../Player";
import DeathBar from "../DeathBar";
import Ball from "../Ball";
import Wall from "../Wall";
import InputManager from "../InputManagerLocal";
import Game from "./Game";

import { socket } from "../../../socket";

class PongLocal extends Game {

    inputManager?: InputManager;
    player1?: Player;
    player2?: Player;
    ball?: Ball;
    walls?: Wall[];
    width: number = 7;
    height: number = 12;

    isDisposed: boolean = false;
    private glowLayer?: GlowLayer;

    constructor() {
        super();
    }

    initialize(): void {
        Services.TimeService!.initialize();
        Services.Scene = new Scene(Services.Engine!);
        Services.Dimensions = new Vector2(this.width, this.height);
        window.addEventListener("keydown", this.showDebugLayer);

        this.inputManager = new InputManager(this);
        this.inputManager.listenToP1();
        this.inputManager.listenToP2();
        
        Services.EventBus!.on("DeathBarHit", this.onDeathBarHit);

        this.drawScene();
    }

    async drawScene() : Promise<void>  {
        if (this.isDisposed || !Services.Scene) return;

        this.glowLayer = new GlowLayer("glow", Services.Scene, {
			blurKernelSize: 32,
			mainTextureRatio: 0.25
		});
		this.glowLayer.intensity = 0.3;

        this.player1 = new Player(undefined);
        this.player2 = new Player(undefined);
        this.walls = [new Wall(), new Wall()];
        this.walls.forEach(wall => Services.Scene!.addMesh(wall.model));
        //this.ball = new Ball();
        const camera: ArcRotateCamera = new ArcRotateCamera("Camera", 0, Math.PI / 4, 10, Vector3.Zero(), Services.Scene);
        camera.attachControl(Services.Canvas, true);
        camera.lowerRadiusLimit = 8;
        camera.upperRadiusLimit = 22;
        camera.wheelDeltaPercentage = 0.01;
        camera.upperBetaLimit = Math.PI / 1.6;
        camera._panningMouseButton = -1;

        //var light2: SpotLight = new SpotLight("spotLight", new Vector3(0, 10, 0), new Vector3(0, -1, 0), Math.PI / 2, 20, Services.Scene);
        //light2.intensity = 0;

		// const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), Services.Scene);

		// hemiLight.intensity = 0.30;
		// //hemiLight.diffuse = new Color3(0.5, 0.6, 1);
		// hemiLight.diffuse = new Color3(0.5, 0.5, 0.5);
		// hemiLight.groundColor = new Color3(0, 0, 0);

        const ground = MeshBuilder.CreateBox("ground", {width: this.width, height: this.height, depth: 0.1}, Services.Scene);
        ground.position = new Vector3(0, -0.05, 0);
        ground.rotate(Vector3.Right(), Math.PI / 2);
        ground.isPickable = false;

        const groundMaterial = new StandardMaterial("groundMat", Services.Scene);
        groundMaterial.diffuseColor = new Color3(0.4, 0.4, 0.4);
        ground.material = groundMaterial;

        //this.ball.setFullPos(new Vector3(0, 0.125, 0));
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

		// Load 3D background model from cache
		if (this.isDisposed || !Services.Scene) return;
		try {
			const meshes = await Services.AssetCache.loadModel('pong-background', './models/pong.glb', Services.Scene);
			if (this.isDisposed) return; // Check again after async operation
			meshes.forEach(mesh => {
				mesh.isPickable = false;
			});
		} catch (e) {
			if (!this.isDisposed) {
				console.error('[PongLocal] Failed to load pong.glb:', e);
			}
		}
    }

    launch() : void {
        this.stop();
    }

    start(): void {
        this.run();
    }

    private onDeathBarHit = (payload: DeathBarPayload) => {
        if (payload.deathBar.owner == this.player1) {
            this.player2!.scoreUp();
        }
        else if (payload.deathBar.owner == this.player2) {
            this.player1!.scoreUp();
        }
        
        // Emit score update event
        Services.EventBus!.emit("Game:ScoreUpdated", {
            player1Score: this.player1!.score,
            player2Score: this.player2!.score,
            scoreToWin: 5
        });

        // Check for game end
        if (this.player1!.score >= 5 || this.player2!.score >= 5) {
            this.endGame();
            return;
        }

        this.ball!.generate(2000);
    }

    run() {
        Services.EventBus!.emit("UI:MenuStateChange", "off");
        Services.Engine!.stopRenderLoop(this.stoppedRenderLoop);
        Services.Engine!.stopRenderLoop(this.renderLoop);

        if (!this.ball) {
            this.ball = new Ball();
            this.ball.generate(2000);
        }
        Services.Engine!.runRenderLoop(this.renderLoop);
    }

    private renderLoop = () => {
        if (this.isDisposed) return;

        Services.TimeService!.update();
        const deltaT = Services.TimeService!.getDeltaTime();
        this.ball!.update(Services.TimeService!.getTimestamp(), deltaT, this.player1!.paddle, this.player2!.paddle);
        this.player1!.update(deltaT);
        this.player2!.update(deltaT);
        this.ball!.render();
        this.player1!.paddle.render();
        this.player2!.paddle.render();
        Services.Scene!.render();
    }

    stop() {
        Services.EventBus!.emit("UI:MenuStateChange", "loading");
        Services.Engine!.stopRenderLoop(this.renderLoop);
        Services.Engine!.runRenderLoop(this.stoppedRenderLoop);
    }

    stoppedRenderLoop() : void {
        if (this.isDisposed) return;
        console.log("ds");
        Services.Scene!.render();
    }

    private endGame() : void {
        Services.EventBus!.emit("UI:MenuStateChange", "pongMenu");
        Services.EventBus!.emit("Game:Ended", {name: "Pong", winnerId: null, score: {player1: this.player1!.score, player2: this.player2!.score}});
    }

    dispose(): void {
        this.isDisposed = true;

        Services.Engine!.stopRenderLoop(this.renderLoop);
        Services.Engine!.stopRenderLoop(this.stoppedRenderLoop);
        Services.Engine!.stopRenderLoop();

        // Dispose glow layer first to avoid postProcessManager errors
        this.glowLayer?.dispose();
        this.glowLayer = undefined;

        // Services.SocketService!.disconnect();
        socket.disconnect();

        this.player1?.dispose();
        this.player2?.dispose();
        this.ball?.dispose();
        this.walls?.forEach(wall => wall.dispose());
        this.inputManager?.dispose();
        Services.EventBus!.off("DeathBarHit", this.onDeathBarHit);
        Services.Scene!.dispose();

        Services.Scene = undefined;
        Services.Dimensions = undefined;

        window.removeEventListener("keydown", this.showDebugLayer);
    }

    showDebugLayer(ev: KeyboardEvent) {
        if (ev.ctrlKey && ev.keyCode === 73) {
            if (Services.Scene!.debugLayer.isVisible()) {
                Services.Scene!.debugLayer.hide();
            } else {
                Services.Scene!.debugLayer.show();
            }
        }
    }
}

export default PongLocal;