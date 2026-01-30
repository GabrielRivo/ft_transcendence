import { Scene, MeshBuilder, StandardMaterial, Color3, ArcRotateCamera, Vector2, Vector3, GlowLayer, Mesh, PBRMaterial, AbstractMesh } from "@babylonjs/core";

import Services from "../Services/Services";
import { DeathBarPayload } from "../globalType";
import Player from "../Player";
import Ball from "../Ball";
import Wall from "../Wall";
import InputManager from "../InputManagerLocal";
import Game from "./Game";
import BlackScreenEffect from "../Effects/BlackScreenEffect";
import CameraShakeEffect from "../Effects/CameraShakeEffect";
import ZoomEffect from "../Effects/ZoomEffect";
import LightUpEffect from "../Effects/LightUpEffect";

class PongLocal extends Game {

    inputManager?: InputManager;
    player1?: Player;
    player2?: Player;
    ball?: Ball;
    walls?: Wall[];
    width: number = 7;
    height: number = 12;
    camera?: ArcRotateCamera;

    isDisposed: boolean = false;
    private glowLayer?: GlowLayer;

    private backgroundMeshes: AbstractMesh[] = [];

    constructor() {
        super();
    }

    initialize(): void {
        Services.TimeService!.initialize();
        
        Services.Scene = new Scene(Services.Engine!);
        Services.Dimensions = new Vector2(this.width, this.height);

        this.inputManager = new InputManager(this);
        this.inputManager.listenToP1();
        this.inputManager.listenToP2();
        
        Services.EventBus!.on("DeathBarHit", this.onDeathBarHit);
        Services.EventBus!.on("BallBounce", this.onBallBounce);
        Services.EventBus!.on("PaddleHitBall", this.onPaddleHitBall);

        this.drawScene();
    }

    drawScene() : void  {
        if (this.isDisposed || !Services.Scene) return;

        const camera: ArcRotateCamera = new ArcRotateCamera("Camera", 0, Math.PI / 4, 11, Vector3.Zero(), Services.Scene);
        camera.inputs.attached.mousewheel.detachControl(); 
        camera.attachControl(Services.Canvas, true);
        camera.lowerRadiusLimit = 8;
        camera.upperRadiusLimit = 22;
        camera.wheelDeltaPercentage = 0.01;
        camera.upperBetaLimit = Math.PI / 1.6;
        camera._panningMouseButton = -1;
        this.camera = camera;

        const blackScreen = new BlackScreenEffect(1, 0);
        blackScreen.play();

        const zoomEffect = new ZoomEffect(22, 11);
        zoomEffect.play(camera);

        this.glowLayer = new GlowLayer("glow", Services.Scene, {
			blurKernelSize: 32,
			mainTextureRatio: 0.25
		});
		this.glowLayer.intensity = 0.3;

        this.player1 = new Player(1);
        this.player2 = new Player(2);
        if (this.isDisposed || !Services.Scene) return;
        this.walls = [new Wall(), new Wall()];
        this.walls.forEach(wall => Services.Scene!.addMesh(wall.model));

        const ground = MeshBuilder.CreateBox("ground", {width: this.width, height: this.height, depth: 0.1}, Services.Scene);
        ground.position = new Vector3(0, -0.05, 0);
        ground.rotate(Vector3.Right(), Math.PI / 2);
        ground.isPickable = false;

        const groundMaterial = new StandardMaterial("groundMat", Services.Scene);
        groundMaterial.diffuseColor = new Color3(0.4, 0.4, 0.4);
        ground.material = groundMaterial;

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
        if (this.isDisposed || !Services.Scene) return;
        try {
            this.backgroundMeshes = await Services.AssetCache.loadModel('pong-background', '/models/pong.glb', Services.Scene);
            if (this.isDisposed) return;
            this.backgroundMeshes.forEach(mesh => {
                mesh.isPickable = false;
            });
        } catch (e) {
            if (!this.isDisposed) {
                this.endGame();
            }
        }
        let ballMesh : Mesh | undefined = undefined;
        if (this.isDisposed || !Services.Scene) return;
        try {
            const ballMeshs = await Services.AssetCache.loadModel('pong-ball', '/models/ball.glb', Services.Scene);
            if (this.isDisposed) return;
            ballMeshs.forEach(mesh => {
                mesh.isPickable = false;
            });
            ballMesh = ballMeshs[0]! as Mesh;
        } catch (e) {
            if (!this.isDisposed) {
                this.endGame();
            }
        }
        if (this.isDisposed || !Services.Scene) return;
        if (ballMesh && this.ball) {
            this.ball.setModelMesh(ballMesh);
        }
    }

    launch() : void {
        this.stop();
    }

    start(): void {
        this.run();
    }

    private onBallBounce = (payload: any): void => {
        let modifier = payload.ball.getSpeed() / 3;
        let duration = 15;
        let magnitude = 0.02 + 0.035 * modifier;
        const cameraShake = new CameraShakeEffect(magnitude, duration);
        cameraShake.play(this.camera!);
    }

    private onPaddleHitBall = (payload: any): void => {
        let modifier = payload.ball.getSpeed() / 3;
        let duration = 25;
        let magnitude = 0.03 + 0.055 * modifier;
        const cameraShake = new CameraShakeEffect(magnitude, duration);
        cameraShake.play(this.camera!);
    }

    private onDeathBarHit = (payload: DeathBarPayload) => {
        this.ball!.setPos(new Vector3(0, -100, 0));
        this.ball!.setModelPos(new Vector3(0, -100, 0));

        const cameraShake = new CameraShakeEffect(0.3, 50);
        const lightUpPillar = new LightUpEffect(0.05, 125);

        let pillarColor: Color3;
        if (payload.deathBar.owner == this.player2)
            pillarColor = new Color3(0.2, 0.8, 1);
        else
            pillarColor = new Color3(0.8, 0.3, 0.8);

        cameraShake.play(this.camera!);
        lightUpPillar.play(Services.Scene!.getMaterialByName("PillarTop") as PBRMaterial, pillarColor);
        if (payload.deathBar.owner == this.player1 && this.player2!.score < 5) {
            this.player2!.scoreUp();
        }
        else if (payload.deathBar.owner == this.player2 && this.player1!.score < 5) {
            this.player1!.scoreUp();
        }
        
        Services.EventBus!.emit("Game:ScoreUpdated", {
            player1Score: this.player1!.score,
            player2Score: this.player2!.score,
            scoreToWin: 5
        });

        if (this.player1!.score == 5 || this.player2!.score == 5) {
            setTimeout(() => {
                if (this.isDisposed) return;
                this.endGame();
            }, 3500);
            return;
        }

        this.ball!.generate(2000, payload.deathBar.owner === this.player1 ? 1 : 2);
    }

    run() {
        Services.EventBus!.emit("UI:MenuStateChange", "off");
        Services.Engine!.stopRenderLoop(this.stoppedRenderLoop);
        Services.Engine!.stopRenderLoop(this.renderLoop);

        if (!this.ball) {
            this.ball = new Ball();
            this.ball.generate(2000, Math.random() < 0.5 ? 1 : 2);
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
        this.ball!.render(deltaT);
        this.player1!.paddle.render();
        this.player2!.paddle.render();
        Services.Scene!.render();
    }

    stop() {
        Services.EventBus!.emit("UI:MenuStateChange", "loading");
        Services.Engine!.stopRenderLoop(this.stoppedRenderLoop);
        Services.Engine!.stopRenderLoop(this.renderLoop);
        Services.Engine!.runRenderLoop(this.stoppedRenderLoop);
    }

    stoppedRenderLoop = () : void => {
        if (this.isDisposed) return;
        Services.Scene!.render();
    }

    private endGame() : void {
        const blackScreen = new BlackScreenEffect(0, 1);
        blackScreen.play();
        setTimeout(() => {
            Services.EventBus!.emit("Game:Ended", { name: "PongLocal", winnerId: null, score: { player1: this.player1!.score, player2: this.player2!.score } });
        }, 1000);
    }

    dispose(): void {
        this.isDisposed = true;

        Services.Engine!.stopRenderLoop(this.renderLoop);
        Services.Engine!.stopRenderLoop(this.stoppedRenderLoop);
        Services.Engine!.stopRenderLoop();
        Services.Engine!.clearInternalTexturesCache();

        this.glowLayer?.dispose();
        this.glowLayer = undefined;

        this.player1?.dispose();
        this.player2?.dispose();
        this.ball?.dispose();
        this.walls?.forEach(wall => wall.dispose());

        this.backgroundMeshes.forEach((mesh) => mesh.dispose());
        this.backgroundMeshes = [];

        this.inputManager?.dispose();
        Services.EventBus!.off("DeathBarHit", this.onDeathBarHit);
        Services.EventBus!.off("BallBounce", this.onBallBounce);
        Services.EventBus!.off("PaddleHitBall", this.onPaddleHitBall);

        Services.Scene?.stopAllAnimations();
        this.camera?.detachControl();
        this.camera?.dispose();
        Services.Scene?.dispose();
        this.camera = undefined;
        Services.Scene = undefined;
        Services.Dimensions = undefined;

        Services.Collision!.clear();
    }
}

export default PongLocal;