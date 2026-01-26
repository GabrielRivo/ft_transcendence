import { Vector3, Animation, Camera, ArcRotateCamera, CubicEase, EasingFunction } from "@babylonjs/core";
import Effect from "./Effect";
import Services from "../Services/Services";

class CameraShakeEffect extends Effect {
    shakeAnimation: Animation;
    multiplier: number;
    duration: number;

    constructor(multiplier: number, duration: number) {
        super();
        this.multiplier = multiplier;
        this.duration = duration;

        this.shakeAnimation = new Animation(
            "shakeAnimation", 
            "target", 
            60, 
            Animation.ANIMATIONTYPE_VECTOR3
        );

        const easingFunction = new CubicEase();
        easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
        this.shakeAnimation.setEasingFunction(easingFunction);
    }

    apply(): void {
    }

    play(camera: ArcRotateCamera): void {
        
        const origin = Vector3.Zero();//camera.target.clone();
        const keys = [];

        for (let i = 0; i < this.duration; i++) {
            const decay = 1 - (i / this.duration);
            
            const shakeAmount = 0.5 * this.multiplier * decay;
            
            const randomShaking = new Vector3(
                (Math.random() - 0.5) * shakeAmount,
                (Math.random() - 0.5) * shakeAmount,
                (Math.random() - 0.5) * shakeAmount
            );

            keys.push({
                frame: i,
                value: origin.add(randomShaking)
            });
        }

        keys.push({
            frame: this.duration,
            value: Vector3.Zero()
        });

        this.shakeAnimation.setKeys(keys);

        camera.animations.push(this.shakeAnimation);
        
        Services.Scene!.beginDirectAnimation(camera, [this.shakeAnimation], 0, this.duration, false, 1, () => {
        });
    }

    stop(): void {
    }

    dispose(): void {
    }
}

export default CameraShakeEffect;