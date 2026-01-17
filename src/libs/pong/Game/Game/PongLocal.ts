import { Engine, Scene, ImportMeshAsync, MeshBuilder, StandardMaterial, SpotLight, Color3, ArcRotateCamera, Vector2, Vector3, HemisphericLight, GlowLayer} from "@babylonjs/core";
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
        let gl = new GlowLayer("glow", Services.Scene, {
			blurKernelSize: 32,
			mainTextureRatio: 0.25
		});
		gl.intensity = 0.3;

        this.player1 = new Player(undefined);
        this.player2 = new Player(undefined);
        this.walls = [new Wall(), new Wall()];
        this.walls.forEach(wall => Services.Scene!.addMesh(wall.model));
        //this.ball = new Ball();
        var camera: ArcRotateCamera = new ArcRotateCamera("Camera", 0, Math.PI / 4, 10, Vector3.Zero(), Services.Scene);
        camera.attachControl(Services.Canvas, true);

        //var light2: SpotLight = new SpotLight("spotLight", new Vector3(0, 10, 0), new Vector3(0, -1, 0), Math.PI / 2, 20, Services.Scene);
        //light2.intensity = 0;

		// const hemiLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), Services.Scene);

		// hemiLight.intensity = 0.30;
		// //hemiLight.diffuse = new Color3(0.5, 0.6, 1);
		// hemiLight.diffuse = new Color3(0.5, 0.5, 0.5);
		// hemiLight.groundColor = new Color3(0, 0, 0);

        let ground = MeshBuilder.CreateBox("ground", {width: this.width, height: this.height, depth: 0.1}, Services.Scene);
        ground.position = new Vector3(0, -0.05, 0);
        ground.rotate(Vector3.Right(), Math.PI / 2);
        ground.isPickable = false;

        let groundMaterial = new StandardMaterial("groundMat", Services.Scene);
        groundMaterial.diffuseColor = new Color3(0.4, 0.4, 0.4);
        ground.material = groundMaterial;

        //this.ball.setFullPos(new Vector3(0, 0.125, 0));
        this.player1.paddle.setModelDirection(new Vector3(0, 0, 1));
        this.player2.paddle.setModelDirection(new Vector3(0, 0, -1));
        this.player1.paddle.setPosition(new Vector3(0, 0.15, -this.height / 2 + 2));
        this.player2.paddle.setPosition(new Vector3(0, 0.15, this.height / 2 - 2));
        this.player1.deathBar.model.position = new Vector3(0, 0.125, -this.height / 2 + 1);
        this.player2.deathBar.model.position = new Vector3(0, 0.125, this.height / 2 - 1);
        this.walls[0].model.position = new Vector3(-this.width / 2 - 0.1, 0.25, 0);
        this.walls[1].model.position = new Vector3(this.width / 2 + 0.1, 0.25, 0);

		const background = await ImportMeshAsync("./models/pong.glb", Services.Scene!);
		background.meshes.forEach(mesh => {
			mesh.isPickable = false;

			// const mat = mesh.material as PBRMaterial;
			// if (mat) {
			// 	if (mat.albedoColor.toLuminance() < 0.01) {
			// 		mat.albedoColor = new Color3(0.02, 0.02, 0.05); // Gris bleuté très profond
			// 	}
			// }
		});
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
        //this.ball = new Ball();
        //this.ball.setFullPos(new Vector3(0, 0.125, 0));
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

        Services.Engine!.stopRenderLoop(this.renderLoop);
        Services.Engine!.stopRenderLoop(this.stoppedRenderLoop);
        Services.Engine!.stopRenderLoop();
        
        this.isDisposed = true;

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