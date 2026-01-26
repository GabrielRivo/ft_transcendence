
import {Vector3, Mesh} from "@babylonjs/core";

abstract class Effect {
    abstract apply(...args: any[]): void;
    abstract play(...args: any[]): void;
    abstract stop(...args: any[]): void;
    abstract dispose(): void;
}

export default Effect;