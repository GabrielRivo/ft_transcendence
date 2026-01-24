import {Vector3, Mesh, MeshBuilder, Animation, StandardMaterial ,Axis, ParticleSystem, Texture, Color3, GlowLayer, BackEase, EasingFunction, Camera, CubicEase} from "@babylonjs/core";
import Effect from "./Effect";
import Services from "../Services/Services";


class ZoomEffect extends Effect {
    emitter: any;
    zoomingAnimation: Animation;

    constructor(start: number,target: number) {
        super();
        this.zoomingAnimation = new Animation("zoomingAnimation", "radius", 60, Animation.ANIMATIONTYPE_FLOAT);
        const scalingAnimationKeyFrames = [
            {
                frame: 0,
                value: start,
            },
            {
                frame: 120,
                value: target,
            },
        ];
        this.zoomingAnimation.setKeys(scalingAnimationKeyFrames);
        const easingFunction = new CubicEase();
        easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
        this.zoomingAnimation.setEasingFunction(easingFunction);
    }

    apply(): void {
    }

    play(camera: Camera): void {

        camera.animations.push(this.zoomingAnimation);

        Services.Scene!.beginAnimation(camera, 0, 120, false, 2);
    }

    stop(): void {
    }

    dispose(): void {
    }
}

export default ZoomEffect;