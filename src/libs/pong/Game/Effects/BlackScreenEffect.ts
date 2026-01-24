import { Vector3, Mesh, MeshBuilder, Animation, StandardMaterial, Axis, ParticleSystem, Texture, Color3, GlowLayer, BackEase, EasingFunction, Camera, CubicEase, Layer, Color4
} from "@babylonjs/core";
import Effect from "./Effect";
import Services from "../Services/Services";

class BlackScreenEffect extends Effect {
    emitter: any;
    blackLayer: Layer;
    fadeAnimation: Animation;

    constructor(initialOpacity: number, targetOpacity: number) {
        super();
        
        this.blackLayer = new Layer("blackScreen", null, Services.Scene!, false);
        this.blackLayer.color = new Color4(0, 0, 0, 1);

        this.fadeAnimation = new Animation("fadeOutAnimation", "color.a", 60, Animation.ANIMATIONTYPE_FLOAT);
        
        const fadeKeys = [
            {
                frame: 0,
                value: initialOpacity,
            },
            {
                frame: 120,
                value: targetOpacity,
            },
        ];
        
        this.fadeAnimation.setKeys(fadeKeys);

        const easingFunction = new CubicEase();
        easingFunction.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
        this.fadeAnimation.setEasingFunction(easingFunction);
    }

    apply(): void {
    }

    play(): void {
        Services.Scene!.beginDirectAnimation(
            this.blackLayer, 
            [this.fadeAnimation], 
            0, 
            120, 
            false, 
            1.5, 
            () => {
                this.dispose();
            }
        );
    }

    stop(): void {
    }

    dispose(): void {
        if (this.blackLayer) {
            this.blackLayer.dispose();
        }
    }
}

export default BlackScreenEffect;