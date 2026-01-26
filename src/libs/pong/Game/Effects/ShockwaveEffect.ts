import {Vector3, Mesh, MeshBuilder, Animation, StandardMaterial ,Axis, ParticleSystem, Texture, Color3, GlowLayer} from "@babylonjs/core";
import Effect from "./Effect";
import Services from "../Services/Services";


class ShockwaveEffect extends Effect {
    emitter: any;
    scalingAnimation: Animation;
    visibilityAnimation: Animation;

    constructor() {
        super();
        this.scalingAnimation = new Animation("scalingAnimation", "scaling", 60, Animation.ANIMATIONTYPE_VECTOR3);
        const scalingAnimationKeyFrames = [
            {
                frame: 0,
                value: new Vector3(0, 0, 0),
            },
            {
                frame: 5,
                value: new Vector3(6, 6, 6),
            },
            {
                frame: 15,
                value: new Vector3(10, 10, 10),
            },
            {
                frame: 25,
                value: new Vector3(12, 12, 12),
            },
            {
                frame: 60,
                value: new Vector3(13.5, 13.5, 13.5),
            },
        ];
        this.scalingAnimation.setKeys(scalingAnimationKeyFrames);

        this.visibilityAnimation = new Animation("visibilityAnimation", "visibility", 60, Animation.ANIMATIONTYPE_FLOAT);
        const visibilityAnimationKeyFrames = [
            {
                frame: 0,
                value: 1,
            },
            {
                frame : 10,
                value: 1,
            },
            {
                frame: 30,
                value: 0.2,
            },
            {
                frame: 40,
                value: 0,
            },
        ];
        this.visibilityAnimation.setKeys(visibilityAnimationKeyFrames);
    }

    apply(): void {

    }
    play(position : Vector3, direction: Vector3): void {
        const ring = MeshBuilder.CreateTorus("shockwave", {thickness: 0.0015, diameter: 0.05, tessellation: 32, }, Services.Scene);
        let material = new StandardMaterial("ringMat", Services.Scene);
            material.emissiveColor = new Color3(1, 1, 1);
        ring.material = material;
        ring.animations.push(this.scalingAnimation);
        ring.animations.push(this.visibilityAnimation);
        ring.isPickable = false;
        ring.visibility = 1;

        direction = direction.normalize();
        ring.position = position;
        ring.lookAt(position.add(direction));
        ring.rotate(Axis.X, Math.PI / 2);
        Services.Scene!.beginAnimation(ring, 0, 60, false, 1.2, () => {
            material.dispose();
            ring.dispose();
        });
    }

    stop(): void {
    }

    dispose(): void {
    }
}

export default ShockwaveEffect;