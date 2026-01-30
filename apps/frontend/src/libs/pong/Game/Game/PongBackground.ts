
import { Scene, MeshBuilder, StandardMaterial, Color3, ArcRotateCamera, Vector2, Vector3, GlowLayer, Mesh, AbstractMesh } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import Services from '../Services/Services';
import { DeathBarPayload } from '../globalType';
import Player from '../Player';
import Ball from '../Ball';
import Wall from '../Wall';
import Game from './Game';
import BlackScreenEffect from '../Effects/BlackScreenEffect';


// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const CAMERA_ROTATION_SPEED = 0.0005;
const AI_SPEED = 0.15;
const AI_REACTION_THRESHOLD = 0.1;

class PongBackground extends Game {
	player1?: Player;
	player2?: Player;
	ball?: Ball;
	walls?: Wall[];

	camera?: ArcRotateCamera;

	width: number = 7;

	height: number = 12;

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
		Services.EventBus!.on('DeathBarHit', this.onDeathBarHit);
		this.drawScene();
	}

	drawScene(): void {
		if (this.isDisposed || !Services.Scene) return;

		this.glowLayer = new GlowLayer('glow', Services.Scene, {
			blurKernelSize: 32,
			mainTextureRatio: 0.25,
		});
		this.glowLayer.intensity = 0.3;

		this.player1 = new Player(1);
		this.player2 = new Player(2);
		this.walls = [new Wall(), new Wall()];
		this.walls.forEach((wall) => Services.Scene!.addMesh(wall.model))


		this.camera = new ArcRotateCamera(
			'Camera',
			0,
			Math.PI / 4,
			15,
			Vector3.Zero(),
			Services.Scene,
		);
		const blackScreen = new BlackScreenEffect(1, 0);
        blackScreen.play();

		const ground = MeshBuilder.CreateBox(
			'ground',
			{ width: this.width, height: this.height, depth: 0.1 },
			Services.Scene,
		);
		ground.position = new Vector3(0, -0.05, 0);
		ground.rotate(Vector3.Right(), Math.PI / 2);
		ground.isPickable = false;

		const groundMaterial = new StandardMaterial('groundMat', Services.Scene);
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

		this.ball = new Ball();
		this.ball.generate(2000, Math.random() < 0.5 ? 1 : 2);
		this.ball.startDirectionRandom();
		
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
                this.dispose();
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
                this.dispose();
            }
        }
        if (this.isDisposed || !Services.Scene) return;
        if (ballMesh && this.ball) {
            this.ball.setModelMesh(ballMesh);
        }
    }

	launch(): void {}

	start(): void { this.run(); }

	// -------------------------------------------------------------------------
	// AI Logic
	// -------------------------------------------------------------------------


	private updateAI(player: Player, ballX: number): void {
		const paddleX = player.paddle.hitbox.position.x;
		const diff = ballX - paddleX;

		if (Math.abs(diff) > AI_REACTION_THRESHOLD) {
			if (diff > 0) {
				player.setPaddleDirection(new Vector3(AI_SPEED, 0, 0));
			} else {
				player.setPaddleDirection(new Vector3(-AI_SPEED, 0, 0));
			}
		} else {
			player.setPaddleDirection(new Vector3(0, 0, 0));
		}
	}

	// -------------------------------------------------------------------------
	// Event Handlers
	// -------------------------------------------------------------------------

	private onDeathBarHit = (_payload: DeathBarPayload): void => {
		if (this.ball) {
			this.ball.generate(2000, _payload.deathBar.owner === this.player1 ? 1 : 2);
			this.ball.startDirectionRandom();
		}
	};

	// -------------------------------------------------------------------------
	// Render Loop
	// -------------------------------------------------------------------------

	run(): void {
		this.isDisposed = false;
		Services.Engine!.stopRenderLoop(this.renderLoop);
		Services.Engine!.runRenderLoop(this.renderLoop);
	}

	private renderLoop = () => {
		if (this.isDisposed) return;
		Services.TimeService!.update();

		if (this.ball && this.player1 && this.player2) {
			const ballPos = this.ball.position;
			this.updateAI(this.player1, ballPos.x);
			this.updateAI(this.player2, ballPos.x);

			this.player1.update(Services.TimeService!.getDeltaTime());
			this.player2.update(Services.TimeService!.getDeltaTime());
			
			if (this.player1.paddle && this.player2.paddle) {
				this.ball.update(Services.TimeService!.getTimestamp(), Services.TimeService!.getDeltaTime(), this.player1.paddle, this.player2.paddle);
				this.ball.render(Services.TimeService!.getDeltaTime());
				this.player1.paddle.render();
				this.player2.paddle.render();
			}
		}

		if (this.camera) {
			this.camera.alpha += CAMERA_ROTATION_SPEED;
		}

		Services.Scene!.render();
    };

	stop(): void {
		Services.Engine!.stopRenderLoop(this.renderLoop);
	}

	// -------------------------------------------------------------------------
	// Cleanup
	// -------------------------------------------------------------------------

	dispose(): void {
		this.isDisposed = true;

		Services.Engine!.stopRenderLoop(this.renderLoop);
		Services.Engine!.clearInternalTexturesCache();

		this.glowLayer?.dispose();
		this.glowLayer = undefined;

		this.player1?.dispose();
		this.player2?.dispose();
		this.ball?.dispose();
		this.walls?.forEach((wall) => wall.dispose());

		this.backgroundMeshes.forEach((mesh) => mesh.dispose());
		this.backgroundMeshes = [];

		Services.EventBus!.off('DeathBarHit', this.onDeathBarHit);

		if (Services.Scene) {
			Services.Scene?.stopAllAnimations();
			this.camera?.detachControl();
			this.camera?.dispose();
			Services.Scene?.dispose();

			this.camera = undefined;
			Services.Scene = undefined;
		}
		Services.Dimensions = undefined;

		Services.Collision!.clear();
	}
}

export default PongBackground;
