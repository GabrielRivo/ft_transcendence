
import {Vector3, Mesh, MeshBuilder, StandardMaterial, Color3, Color4, PickingInfo } from "@babylonjs/core";
import Services from "./Services/Services";
import { OwnedMesh, DeathBarPayload } from "./globalType";
import Ball from "./Ball";

class DeathBar {
    model: OwnedMesh<DeathBar>;
    owner: any;

    constructor(model?: Mesh, owner?: any) {
        let black : Color4 = new Color4(0, 0, 0, 1);
        this.model = model ?? MeshBuilder.CreateBox("deathBar", {size: 0.1, width: 7 , height: 0.1}, Services.Scene);
        let material = new StandardMaterial("deathBarMat", Services.Scene);
        material.emissiveColor = new Color3(1, 1, 1);
        this.model.material = material;

        this.owner = owner;
        this.model.owner = this;
    }

    onBallHit(ball: Ball) {
        Services.EventBus!.emit("DeathBarHit", {deathBar: this, ball: ball} as DeathBarPayload);
        //console.log("DeathBar hit by ball");
    }

    dispose() {
        this.model.dispose();
    }
}

export default DeathBar;