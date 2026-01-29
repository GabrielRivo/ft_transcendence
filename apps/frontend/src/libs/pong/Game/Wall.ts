
import { Mesh, MeshBuilder, PickingInfo } from "@babylonjs/core";
import Services from "./Services/Services";
import Ball from "./Ball";

import { OwnedMesh } from "./globalType";


class Wall {
    model: OwnedMesh<Wall>;
    
    constructor(model?: Mesh) {
        this.model = model ?? MeshBuilder.CreateBox("wall", {height: 0.5, width: 0.2, depth: Services.Dimensions!.y}, Services.Scene);
        
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