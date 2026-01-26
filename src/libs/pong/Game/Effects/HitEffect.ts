
import {Vector3, Mesh, MeshBuilder, StandardMaterial ,Axis, ParticleSystem, Texture, Color4, ConeParticleEmitter, TransformNode} from "@babylonjs/core";
import Effect from "./Effect";
import Services from "../Services/Services";

class HitEffect extends Effect {
    emitter: Mesh;
    coneEmitter: ConeParticleEmitter;
    explosion: ParticleSystem;
    emitCount: number = 10;
    
    constructor() {
        super();
        let radius = 0.3;
        let angle = Math.PI / 1.4;
        let height = radius / Math.tan(angle / 2);
        let cone = MeshBuilder.CreateCylinder("cone", {diameterBottom:0, diameterTop: 2 * radius, height: height});
        cone.material = new StandardMaterial("mat");
        cone.material.wireframe = true;
        cone.visibility = 0;
        cone.isPickable = false;

        this.emitter = cone;

        this.coneEmitter = new ConeParticleEmitter(radius, angle);
        this.coneEmitter.radiusRange = 1;
        this.coneEmitter.heightRange = 1;

        // this.explosion = new ParticleSystem("hitEffect", 2000, Services.Scene!);
        this.explosion = new ParticleSystem("hitEffect", 2000, null!); //WARNING

        this.explosion.particleTexture = new Texture("/dot.png");
        this.explosion.emitter = this.emitter;
        this.explosion.particleEmitterType = this.coneEmitter;
        this.explosion.addSizeGradient(0, 0.1);
        this.explosion.addSizeGradient(1, 0);
        this.explosion.color1 = new Color4(1, 1, 1, 1);
        this.explosion.colorDead = new Color4(1, 1, 1, 1);
        this.explosion.minLifeTime = 0.2;
        this.explosion.maxLifeTime = 0.3;
        this.explosion.minEmitPower = 4;
        this.explosion.maxEmitPower = 5;
        this.explosion.gravity = new Vector3(0, -12, 0);
        this.explosion.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    }

    apply(position : Vector3, direction: Vector3): void {
        direction = direction.normalize();
        this.emitter.position = position;
        this.emitter.lookAt(position.add(direction));
        this.emitter.rotate(Axis.X, Math.PI / 2);
    }
    
    play(position?: Vector3, direction?: Vector3): void {
        if (position && direction)
            this.apply(position, direction);
        this.explosion.manualEmitCount = this.emitCount;
        this.explosion.start();
    }

    stop(): void {
        this.explosion.stop();
    }

    dispose(): void {
        this.explosion.dispose();
        this.emitter.dispose();
    }
}

export default HitEffect;