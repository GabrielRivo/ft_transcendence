
import { Scene, Vector3, Mesh, MeshBuilder, Color4, Ray, PickingInfo } from "@babylonjs/core";
import Services from "./Services/Services";
import Ball from "./Ball";

import { OwnedMesh } from "./globalType";


class Wall {
    model: OwnedMesh<Wall>;
    
    constructor(model?: Mesh) {
        let black : Color4 = new Color4(0, 0, 0, 1);
        this.model = model ?? MeshBuilder.CreateBox("wall", {height: 0.5, width: 0.2, depth: Services.Dimensions!.y, faceColors: [black, black, black, black, black, black]});
        Services.Collision!.add(this.model);
        this.model.owner = this;
		this.model.visibility = 0;
    }

    onBallHit(ball: Ball, hitInfo: PickingInfo) {
        ball.bounce(hitInfo);
    }

    dispose() {
        this.model.dispose();
    }
}

export default Wall;