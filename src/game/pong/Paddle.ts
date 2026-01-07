
import {Vector3, Mesh, MeshBuilder, StandardMaterial, Color3, PickingInfo, Quaternion} from "@babylonjs/core";
import Services from "./Services/Services.js";
import { OwnedMesh } from "./globalType.js";
import Ball from "./Ball.js";
import MathUtils from "./MathUtils.js";

class Paddle {
    private services: Services;

    model: OwnedMesh<Paddle>;
    direction: Vector3 = new Vector3(0, 0, 0);
    modelDirection: Vector3 = new Vector3(0, 1, 0).normalize();
    speed : number = 9;
    owner: any;

    constructor(services: Services, owner?: any) {
        this.services = services;
        this.model = MeshBuilder.CreateBox("paddle", {size: 0.15, width: 1.2 , height: 0.15});
		// this.model = MeshBuilder.CreateBox("paddle", {size: 0.30, width: 5.0 , height: 0.30});
        let material = new StandardMaterial("playerMat", this.services.Scene);
        material.emissiveColor = new Color3(0.8, 0, 0.2);
        this.model.material = material;

        this.model.isPickable = true;
        this.services.Collision!.add(this.model);

        this.direction = new Vector3(0, 0, 0);

        this.owner = owner;
        this.model.owner = this;
    }

    setDirection(direction: Vector3) {
        this.direction = direction;
    }
	getDirection() : Vector3 {
		return this.direction;
	}
    setModelDirection(modelDirection: Vector3) {
        this.modelDirection = modelDirection;
        this.model.setDirection(modelDirection);
    }
	getModelDirection() : Vector3 {
		return this.modelDirection;
	}

    setPosition(position: Vector3) {
        this.model.position.copyFrom(position);
    }
	getPosition() : Vector3 {
		return this.model.position;
	}

    move() {
        const basePos : Vector3 = this.model.position.clone();
        const deltaT : number = this.services.Engine!.getDeltaTime() / 1000;
        const distance : number = this.speed * deltaT;
        const displacement : Vector3 = this.direction.scale(distance);
        let newPos : Vector3 = basePos.add(displacement);

        const playerBox = this.model.getBoundingInfo().boundingBox.extendSize;
        const maxX = this.services.Dimensions!.x / 2 - playerBox.x;
        
        newPos.x = Math.min(Math.max(newPos.x, -maxX), maxX);
        this.model.position.copyFrom(newPos);
    }

    onBallHit(ball: Ball) {
        let abstractPaddlePos : Vector3 = new Vector3(this.model.position.x, 0, this.model.position.z).add(this.modelDirection.scale(-0.225));
        let abstractBallPos : Vector3 = new Vector3(ball.position.x, 0, ball.position.z);
        let newDir : Vector3 = abstractBallPos.subtract(abstractPaddlePos).normalize();

        let angle : number = Math.acos(Vector3.Dot(this.modelDirection, newDir));
        let cross : number = this.modelDirection.x * newDir.z - this.modelDirection.z * newDir.x;
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
    }

    update() {
        this.move();
    }

    dispose() {
        this.model.dispose();
    }
}

export default Paddle;