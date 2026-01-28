
import { Vector3 } from "@babylonjs/core";

class MathUtils {
    static reflectVector(toreflect: Vector3, normal: Vector3): Vector3 {
        const dot = Vector3.Dot(toreflect, normal);
        return toreflect.subtract(normal.scale(2 * dot));
    }

    static wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static rotateOnXZ(forward: Vector3, angle: number) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const x = forward.x * cos - forward.z * sin;
        const z = forward.x * sin + forward.z * cos;

        return new Vector3(x, 0, z).normalize();
    }
}

export default MathUtils;