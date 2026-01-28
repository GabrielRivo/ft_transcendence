
import { Mesh, MeshBuilder, StandardMaterial, Color3 } from "@babylonjs/core";
import Services from "./Services/Services.js";
import { OwnedMesh, DeathBarPayload } from "./globalType.js";
import Ball from "./Ball.js";

class DeathBar {
    private services: Services;

    model: OwnedMesh<DeathBar>;
    owner: any;

    constructor(services: Services, model?: Mesh, owner?: any) {
        this.services = services;
        this.model = model ?? MeshBuilder.CreateBox("deathBar", { size: 0.1, width: 7, height: 0.1 });
        let material = new StandardMaterial("deathBarMat", this.services.Scene);
        material.emissiveColor = new Color3(1, 1, 1);
        this.model.material = material;

        this.owner = owner;
        this.model.owner = this;
    }

    onBallHit(ball: Ball) {
        this.services.EventBus!.emit("DeathBarHit", { deathBar: this, ball: ball } as DeathBarPayload);
    }

    dispose() {
        this.model.dispose();
    }
}

export default DeathBar;