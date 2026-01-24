import {Vector3, Mesh, MeshBuilder, Animation, StandardMaterial ,Axis, ParticleSystem, Texture, Color3, GlowLayer, BackEase, EasingFunction, Camera, CubicEase} from "@babylonjs/core";
import Effect from "./Effect";
import Services from "../Services/Services";


class ZoomEffect extends Effect {
    emitter: any;
    rotateCameraAnimation: Animation;

    constructor(target: number) {
        super();
        this.rotateCameraAnimation = new Animation("rotateCameraAnimation", "alpha", 60, Animation.ANIMATIONTYPE_FLOAT);
        const scalingAnimationKeyFrames = [
            {
                frame: 0,
                value: 0,
            },
            {
                frame: 120,
                value: target,
            },
        ];
        this.rotateCameraAnimation.setKeys(scalingAnimationKeyFrames);
        const easingFunction = new CubicEase();
        easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
        this.rotateCameraAnimation.setEasingFunction(easingFunction);
    }

    apply(): void {
    }
    
    play(camera: Camera): void {

        camera.animations.push(this.rotateCameraAnimation);

        Services.Scene!.beginDirectAnimation(camera, [this.rotateCameraAnimation],0, 120, false, 1.2);
    }

    stop(): void {
    }

    dispose(): void {
    }
}

export default ZoomEffect;