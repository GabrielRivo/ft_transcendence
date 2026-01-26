import { Animation, Color3, PBRMaterial, StandardMaterial, CubicEase, EasingFunction } from "@babylonjs/core";
import Effect from "./Effect";
import Services from "../Services/Services";

class LightUpEffect extends Effect {
    private duration: number;
    private peakPercentage: number;

    constructor(peakPercentage: number, duration: number) {
        super();
        this.duration = duration;
        this.peakPercentage = peakPercentage; 
    }

    play(material: PBRMaterial | StandardMaterial, targetColor: Color3 = new Color3(1, 1, 1)): void {
        Services.Scene!.stopAnimation(material);

        const anim = new Animation("lightUpAnim", "emissiveColor", 60, Animation.ANIMATIONTYPE_COLOR3);

        const easingFunction = new CubicEase();
        easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
        anim.setEasingFunction(easingFunction);

        const keys = [];

        keys.push({
            frame: 0,
            value: Color3.Black()
        });

        const peakFrame = Math.floor(this.duration * this.peakPercentage);
        keys.push({
            frame: peakFrame,
            value: targetColor
        });

        keys.push({
            frame: this.duration,
            value: Color3.Black()
        });

        anim.setKeys(keys);

        Services.Scene!.beginDirectAnimation(material, [anim], 0, this.duration, false, 1, () => {
            material.emissiveColor = Color3.Black();
        });
    }

    stop(): void {
    }

    apply(): void {
    }

    dispose(): void {
    }
}

export default LightUpEffect;