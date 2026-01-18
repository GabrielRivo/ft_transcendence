
import {Vector3, Mesh, MeshBuilder, StandardMaterial, Color3, PickingInfo, Quaternion} from "@babylonjs/core";
import Services from "./Services/Services";
import { OwnedMesh } from "./globalType";
import Ball from "./Ball";
import MathUtils from "./MathUtils";

class Paddle {
    model: OwnedMesh<Paddle>;
    direction: Vector3 = new Vector3(0, 0, 0);
    position: Vector3 = new Vector3(0, 0, 0);
    modelDirection: Vector3 = new Vector3(0, 1, 0).normalize();
    speed : number = 9; //9
    owner: any;

    private visualOffset: Vector3 = new Vector3(0, 0, 0);

    constructor(owner?: any) {
        this.model = MeshBuilder.CreateBox("paddle", {size: 0.15, width: 1.2 , height: 0.15});
		// this.model = MeshBuilder.CreateBox("paddle", {size: 0.30, width: 5.0 , height: 0.30});
        let material = new StandardMaterial("playerMat", Services.Scene);
        material.emissiveColor = new Color3(0.8, 0, 0.2);
        this.model.material = material;

        this.model.isPickable = true;
        Services.Collision!.add(this.model);

        this.direction = new Vector3(0, 0, 0);

        this.owner = owner;
        this.model.owner = this;
    }

    getDirection(): Vector3 {
        return this.direction.clone();
    }
    setDirection(direction: Vector3) {
        this.direction = direction;
    }
    setModelDirection(modelDirection: Vector3) {
        this.modelDirection = modelDirection;
        this.model.setDirection(modelDirection);
    }

    getPosition(): Vector3 {
        return this.position.clone();
    }
    setPosition(position: Vector3) {
        this.position.copyFrom(position);
    }
    setFullPosition(position: Vector3) {
        this.position.copyFrom(position);
        this.model.position.copyFrom(position);
    }

    getSpeed(): number {
        return this.speed;
    }

    move(deltaT: number) {
        const basePos : Vector3 = this.position;//this.model.position.clone();
        deltaT = deltaT / 1000;
        const distance : number = this.speed * deltaT;
        const displacement : Vector3 = this.direction.scale(distance);
        let newPos : Vector3 = basePos.add(displacement);

        const playerBox = this.model.getBoundingInfo().boundingBox.extendSize;
        const maxX = Services.Dimensions!.x / 2 - playerBox.x;
        
        newPos.x = Math.min(Math.max(newPos.x, -maxX), maxX);
        //this.model.position.copyFrom(newPos);
        this.position.copyFrom(newPos);
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
        console.log("Ball hit by paddle, new direction : ", newDir, " angle : ", angle);
    }

    public reconcile(serverPos: Vector3): void {
        const previousPos = this.position.clone();

        this.position.copyFrom(serverPos);
        
        const jump = previousPos.subtract(this.position);

        //console.log("Paddle reconcile. Server pos: ", serverPos, " Previous pos: ", previousPos, " New pos: ", this.position, " Jump: ", jump);
        
        this.visualOffset.addInPlace(jump);

        this.model.position.copyFrom(this.position).addInPlace(this.visualOffset);
    }

    update(deltaT: number) {
        this.move(deltaT);
        this.visualOffset = Vector3.Lerp(this.visualOffset, Vector3.Zero(), 0.05);
        if (this.visualOffset.lengthSquared() < 0.001) {
            this.visualOffset.setAll(0);
        }
        this.model.position.copyFrom(this.position).addInPlace(this.visualOffset);
        this.model.computeWorldMatrix(true);
    }

    dispose() {
        this.model.dispose();
    }
}

export default Paddle;