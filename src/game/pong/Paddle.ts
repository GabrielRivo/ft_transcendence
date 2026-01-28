
import { Vector3, MeshBuilder, StandardMaterial, Color3 } from "@babylonjs/core";
import Services from "./Services/Services.js";
import { OwnedMesh } from "./globalType.js";
import Ball from "./Ball.js";
import MathUtils from "./MathUtils.js";

class Paddle {
    private services: Services;

    model: OwnedMesh<Paddle>;
    trigger1: OwnedMesh<Paddle>;
    trigger2: OwnedMesh<Paddle>;
    trigger3: OwnedMesh<Paddle>;
    direction: Vector3 = new Vector3(0, 0, 0);
    modelDirection: Vector3 = new Vector3(0, 1, 0).normalize();
    speed: number = 4;
    owner: any;

    constructor(services: Services, owner?: any) {
        this.services = services;
        this.model = MeshBuilder.CreateBox("paddle", { size: 0.15, width: 1.2, height: 0.15 });

        let subPaddle: OwnedMesh;
        for (let i = 0; i < 5; i++) {
            subPaddle = MeshBuilder.CreateBox("paddle", { size: 0.15, width: 1.2 - (i + 1) * 0.1, height: 0.15 });
            subPaddle.parent = this.model;
            subPaddle.owner = this;
            this.services.Collision!.add(subPaddle);
            subPaddle.visibility = 0;
        }

        this.trigger1 = MeshBuilder.CreateBox("paddleTrigger", { size: 0.15, width: 7, height: 0.15 });
        this.trigger2 = MeshBuilder.CreateBox("paddleTrigger", { size: 0.15, width: 7, height: 0.15 });
        this.trigger3 = MeshBuilder.CreateBox("paddleTrigger", { size: 0.15, width: 7, height: 0.15 });

        // this.model = MeshBuilder.CreateBox("paddle", {size: 0.30, width: 5.0 , height: 0.30});
        let material = new StandardMaterial("playerMat", this.services.Scene);
        material.emissiveColor = new Color3(0.8, 0, 0.2);
        this.model.material = material;
        this.trigger1.material = material;
        this.trigger1.visibility = 0;
        this.trigger2.material = material;
        this.trigger2.visibility = 0;
        this.trigger3.material = material;
        this.trigger3.visibility = 0;

        this.model.isPickable = true;
        this.services.Collision!.add(this.model);
        this.services.Collision!.add(this.trigger1);
        this.services.Collision!.add(this.trigger2);

        this.direction = new Vector3(0, 0, 0);

        this.owner = owner;
        this.model.owner = this;
        this.trigger1.owner = this;
        this.trigger2.owner = this;
    }

    setDirection(direction: Vector3) {
        this.direction = direction;
    }
    getDirection(): Vector3 {
        return this.direction.clone();
    }
    setModelDirection(modelDirection: Vector3) {
        this.modelDirection = modelDirection;
        this.model.setDirection(modelDirection);
    }
    getModelDirection(): Vector3 {
        return this.modelDirection;
    }

    getPosition(): Vector3 {
        return this.model.position.clone();
    }
    setPosition(position: Vector3) {
        this.model.position.copyFrom(position);
    }
    setTrigger1Position(position: Vector3) {
        this.trigger1.position.copyFrom(position);
        this.trigger1.computeWorldMatrix(true);
    }
    setTrigger2Position(position: Vector3) {
        this.trigger2.position.copyFrom(position);
        this.trigger2.computeWorldMatrix(true);
    }
    setTrigger3Position(position: Vector3) {
        this.trigger3.position.copyFrom(position);
        this.trigger3.computeWorldMatrix(true);
    }

    getSpeed(): number {
        return this.speed;
    }

    move(deltaT: number) {
        deltaT = deltaT / 1000;
        const basePos: Vector3 = this.model.position.clone();
        const distance: number = this.speed * deltaT;
        const displacement: Vector3 = this.direction.scale(distance);
        let newPos: Vector3 = basePos.add(displacement);

        const playerBox = this.model.getBoundingInfo().boundingBox.extendSize;
        const maxX = this.services.Dimensions!.x / 2 - playerBox.x;

        newPos.x = Math.min(Math.max(newPos.x, -maxX), maxX);
        this.model.position.copyFrom(newPos);
    }

    onBallHit(ball: Ball) {
        let abstractPaddlePos: Vector3 = new Vector3(this.model.position.x, 0, this.model.position.z).add(this.modelDirection.scale(-0.225));
        let abstractBallPos: Vector3 = new Vector3(ball.position.x, 0, ball.position.z);
        let newDir: Vector3 = abstractBallPos.subtract(abstractPaddlePos).normalize();

        let angle: number = Math.acos(Vector3.Dot(this.modelDirection, newDir));
        let cross: number = this.modelDirection.x * newDir.z - this.modelDirection.z * newDir.x;
        angle = cross >= 0 ? angle : -angle;


        if (angle < -Math.PI / 3) {
            angle = -Math.PI / 3;
            //newDir = this.direction.scale(Math.cos(angle)).add(newDir.scale(Math.sin(angle))).normalize();
            newDir = MathUtils.rotateOnXZ(this.modelDirection, angle);
        }
        else if (angle > Math.PI / 3) {
            angle = Math.PI / 3;
            //newDir = new Vector3(Math.sin(angle), 0, Math.cos(angle));
            newDir = MathUtils.rotateOnXZ(this.modelDirection, angle);
        }
        ball.setDir(newDir);
        //ball.bounce(hitInfo);
        ball.speedUp();
        ball.owner = this.owner;
        this.owner.hitCount++;
    }

    update(deltaT: number) {
        this.move(deltaT);
        this.model.computeWorldMatrix(true);
        this.model.getChildren().forEach(child => {
            child.computeWorldMatrix(true);
        });
    }

    dispose() {
        this.model.dispose();
        this.trigger1.dispose();
        this.trigger2.dispose();
    }
}

export default Paddle;