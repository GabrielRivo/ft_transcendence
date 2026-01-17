// =============================================================================
// PongBackground - Animated Background Game (AI vs AI)
// =============================================================================
//
// This class provides an animated Pong game that plays itself (AI vs AI).
// It's designed to be used as an animated background in the application layout.
//
// ## Key Differences from PongLocal/PongOnline
//
// - No user input handling (both paddles are AI-controlled)
// - No WebSocket connection
// - No score tracking UI events
// - Simplified render loop with camera rotation for visual interest
// - Automatic ball reset on score
//
// ## Usage
//
// Used in MainLayout as an animated background:
// ```tsx
// <Game mode="background" />
// ```
//
// =============================================================================

import {
	Scene,
	MeshBuilder,
	StandardMaterial,
	Color3,
	ArcRotateCamera,
	Vector2,
	Vector3,
	GlowLayer,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { SceneLoader } from '@babylonjs/core';
import Services from '../Services/Services';
import { DeathBarPayload } from '../globalType';
import Player from '../Player';
import Ball from '../Ball';
import Wall from '../Wall';
import Game from './Game';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Camera rotation speed for ambient animation */
const CAMERA_ROTATION_SPEED = 0.0005;

/** AI paddle movement speed */
const AI_SPEED = 0.08;

/** AI reaction delay (makes it beatable and more natural) */
const AI_REACTION_THRESHOLD = 0.3;

// -----------------------------------------------------------------------------
// PongBackground Class
// -----------------------------------------------------------------------------

/**
 * Animated background Pong game with AI vs AI.
 *
 * This class creates a self-playing Pong game suitable for use as
 * an animated background. Both paddles are controlled by simple AI,
 * and the camera slowly rotates for visual interest.
 *
 * @example
 * ```typescript
 * const background = new PongBackground();
 * background.initialize();
 * background.start();
 *
 * // Later, when component unmounts:
 * background.dispose();
 * ```
 */
class PongBackground extends Game {
	// -------------------------------------------------------------------------
	// Game Objects
	// -------------------------------------------------------------------------

	/** Player 1 object (bottom of screen) */
	player1?: Player;

	/** Player 2 object (top of screen) */
	player2?: Player;

	/** Ball object */
	ball?: Ball;

	/** Side walls array */
	walls?: Wall[];

	/** Main camera */
	camera?: ArcRotateCamera;

	/** Game field width */
	width: number = 7;

	/** Game field height */
	height: number = 12;

	isDisposed: boolean = false;

	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor() {
		super();
	}

	// -------------------------------------------------------------------------
	// Game Lifecycle Methods
	// -------------------------------------------------------------------------

	/**
	 * Initializes the background game scene.
	 *
	 * Sets up Babylon.js scene, creates game objects, but does NOT
	 * set up user input handlers (AI controls both paddles).
	 */
	initialize(): void {
		console.log('[PongBackground] Initializing background game');

		// Create the Babylon.js scene
		Services.Scene = new Scene(Services.Engine!);
		Services.Dimensions = new Vector2(this.width, this.height);

		// Register for death bar hits (scoring)
		Services.EventBus!.on('DeathBarHit', this.onDeathBarHit);

		// Draw the 3D scene
		this.drawScene();

		// Initialize time service for delta time calculations
		Services.TimeService!.initialize();
	}

	/**
	 * Draws the 3D game scene.
	 *
	 * Creates all visual elements including players, ball, walls,
	 * ground, lighting, and loads the 3D background model.
	 */
	async drawScene(): Promise<void> {
		// Set up glow effect layer for neon aesthetics
		const gl = new GlowLayer('glow', Services.Scene, {
			blurKernelSize: 32,
			mainTextureRatio: 0.25,
		});
		gl.intensity = 0.3;

		// Create game objects
		this.player1 = new Player(undefined);
		this.player2 = new Player(undefined);
		this.walls = [new Wall(), new Wall()];
		this.walls.forEach((wall) => Services.Scene!.addMesh(wall.model));
		//this.ball = new Ball();

		// Set up camera with slightly elevated angle for background view
		this.camera = new ArcRotateCamera(
			'Camera',
			0,
			Math.PI / 4,
			15,
			Vector3.Zero(),
			Services.Scene,
		);
		// Don't attach controls - this is a background, not interactive
		// this.camera.attachControl(Services.Canvas, true);

		// Create ground plane
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

		// Position game objects
		//this.ball.setFullPos(new Vector3(0, 0.125, 0));
		this.player1.paddle.setModelDirection(new Vector3(0, 0, 1));
		this.player2.paddle.setModelDirection(new Vector3(0, 0, -1));
		this.player1.paddle.setPosition(new Vector3(0, 0.15, -this.height / 2 + 2));
		this.player2.paddle.setPosition(new Vector3(0, 0.15, this.height / 2 - 2));
		this.player1.deathBar.model.position = new Vector3(0, 0.125, -this.height / 2 + 1);
		this.player2.deathBar.model.position = new Vector3(0, 0.125, this.height / 2 - 1);
		this.walls[0].model.position = new Vector3(-this.width / 2 - 0.1, 0.25, 0);
		this.walls[1].model.position = new Vector3(this.width / 2 + 0.1, 0.25, 0);

		this.ball = new Ball();
		this.ball.generate(0);
		this.ball.startDirectionRandom();
		// Load 3D background model
		try {
			const background = await SceneLoader.ImportMeshAsync('', './models/', 'pong.glb', Services.Scene!);
			background.meshes.forEach((mesh) => {
				mesh.isPickable = false;
			});
		} catch (e) {
			console.error('[PongBackground] Failed to load pong.glb:', e);
		}
	}

	/**
	 * Launches the game (prepares for start).
	 */
	launch(): void {
		// Nothing special needed for background mode
	}

	/**
	 * Starts the background game animation.
	 */
	start(): void {
		console.log('[PongBackground] Starting background animation');
		this.run();
	}

	// -------------------------------------------------------------------------
	// AI Logic
	// -------------------------------------------------------------------------

	/**
	 * Simple AI that moves paddle towards the ball.
	 *
	 * @param player - The player to control
	 * @param ballX - The ball's X position
	 */
	private updateAI(player: Player, ballX: number): void {
		const paddleX = player.paddle.model.position.x;
		const diff = ballX - paddleX;

		// Add some "imperfection" to make it look more natural
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

	/**
	 * Handles death bar hit events (scoring).
	 * Simply resets the ball without tracking score.
	 */
	private onDeathBarHit = (_payload: DeathBarPayload): void => {
		// Reset ball position
		if (this.ball) {
			this.ball.generate(1000);
			this.ball.startDirectionRandom();
		}
	};

	// -------------------------------------------------------------------------
	// Render Loop
	// -------------------------------------------------------------------------

	/**
	 * Starts the render loop with AI control and camera rotation.
	 */
	run(): void {
		this.isDisposed = false;
		Services.Engine!.stopRenderLoop(this.renderLoop);
		Services.Engine!.runRenderLoop(this.renderLoop);
	}

	private renderLoop = () => {
		console.log("renderLoop background");
		if (this.isDisposed) return;
		Services.TimeService!.update();

		// Update AI for both players
		if (this.ball && this.player1 && this.player2) {
			const ballPos = this.ball.position;
			this.updateAI(this.player1, ballPos.x);
			this.updateAI(this.player2, ballPos.x);

			// Update game objects
			this.player1.update(Services.TimeService!.getDeltaTime());
			this.player2.update(Services.TimeService!.getDeltaTime());
			
			// Note: Assure-toi que player1.paddle existe avant d'y accéder !
			if (this.player1.paddle && this.player2.paddle) {
				this.ball.update(Services.TimeService!.getTimestamp(), Services.TimeService!.getDeltaTime(), this.player1.paddle, this.player2.paddle);
				// console.log("Ball speed : ", this.ball.speed); // Décommente pour debug
			}
		}

		// Rotate camera
		if (this.camera) {
			this.camera.alpha += CAMERA_ROTATION_SPEED;
		}

		Services.Scene!.render();
    };

	/**
	 * Stops the game (continues rendering but no game logic).
	 */
	stop(): void {
		Services.Engine!.stopRenderLoop(this.renderLoop);
	}

	// -------------------------------------------------------------------------
	// Cleanup
	// -------------------------------------------------------------------------

	/**
	 * Disposes of all game resources.
	 */
	dispose(): void {
		this.isDisposed = true;
		console.log('[PongBackground] Disposing background game');

		// Stop render loop
		Services.Engine!.stopRenderLoop(this.renderLoop);

		// Dispose game objects
		this.player1?.dispose();
		this.player2?.dispose();
		this.ball?.dispose();
		this.walls?.forEach((wall) => wall.dispose());

		// Remove event listeners
		Services.EventBus!.off('DeathBarHit', this.onDeathBarHit);

		// Dispose Babylon.js scene
		if (Services.Scene) {
			Services.Scene.dispose();
			Services.Scene = undefined;
		}
		Services.Dimensions = undefined;
	}
}

export default PongBackground;
