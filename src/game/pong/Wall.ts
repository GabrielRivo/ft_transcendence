
import { Mesh, MeshBuilder, Color4, PickingInfo } from "@babylonjs/core";
import Services from "./Services/Services.js";
import Ball from "./Ball.js";

import { OwnedMesh } from "./globalType.js";


class Wall {
    private services: Services;

    model: OwnedMesh<Wall>;

    constructor(services: Services, model?: Mesh) {
        this.services = services;
        let black: Color4 = new Color4(0, 0, 0, 1);
        this.model = model ?? MeshBuilder.CreateBox("wall", { height: 0.5, width: 0.2, depth: this.services.Dimensions!.y, faceColors: [black, black, black, black, black, black] });
        this.services.Collision!.add(this.model);
        this.model.owner = this;
    }

    onBallHit(ball: Ball, hitInfo: PickingInfo) {
        ball.bounce(hitInfo);
    }

    dispose() {
        this.model.dispose();
    }
}

export default Wall;