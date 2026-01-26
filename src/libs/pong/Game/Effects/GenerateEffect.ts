import {Vector3, Mesh, MeshBuilder, Animation, StandardMaterial ,Axis, ParticleSystem, Texture, Color3, GlowLayer, BackEase, EasingFunction} from "@babylonjs/core";
import Effect from "./Effect";
import Services from "../Services/Services";


class GenerateEffect extends Effect {
    scalingAnimation: Animation;

    constructor() {
        super();
        this.scalingAnimation = new Animation("scalingAnimation", "scaling", 60, Animation.ANIMATIONTYPE_VECTOR3);
        const scalingAnimationKeyFrames = [
            {
                frame: 0,
                value: new Vector3(0, 0, 0),
            },
            {
                frame: 60,
                value: new Vector3(1, 1, 1),
            },
        ];
        this.scalingAnimation.setKeys(scalingAnimationKeyFrames);
        const easingFunction = new BackEase(0.5);
        easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
        this.scalingAnimation.setEasingFunction(easingFunction);
    }

    apply(): void {

    }
    play(mesh: Mesh): void {

        mesh.animations.push(this.scalingAnimation);

        Services.Scene!.beginAnimation(mesh, 0, 60, false, 2);
    }

    stop(): void {
    }

    dispose(): void {
    }
}

export default GenerateEffect;