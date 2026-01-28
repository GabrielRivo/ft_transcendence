
import {Vector3, Mesh, MeshBuilder, StandardMaterial, Color3, PickingInfo, Quaternion} from "@babylonjs/core";
import Services from "./Services/Services";
import { OwnedMesh } from "./globalType";
import Ball from "./Ball";
import MathUtils from "./MathUtils";

class Paddle {
    model: Mesh;
    hitbox: OwnedMesh<Paddle>;
    trigger1: OwnedMesh<Paddle>;
    trigger2: OwnedMesh<Paddle>;
    trigger3: OwnedMesh<Paddle>;
    direction: Vector3 = new Vector3(0, 0, 0);
    position: Vector3 = new Vector3(0, 0, 0);
    hitboxDirection: Vector3 = new Vector3(0, 1, 0).normalize();
    speed : number = 4; //9
    owner: any;

    private visualOffset: Vector3 = new Vector3(0, 0, 0);

    constructor(owner: any, nbr: number) {
        this.model = MeshBuilder.CreateBox("paddle", {size: 0.15, width: 1.2 , height: 0.15}, Services.Scene);

        this.hitbox = MeshBuilder.CreateBox("paddle", {size: 0.15, width: 1.2 , height: 0.15}, Services.Scene);

        let subPaddle : OwnedMesh;
        for (let i=0; i < 5; i++) {
            subPaddle = MeshBuilder.CreateBox("paddle", {size: 0.15, width: 1.2 - (i+1)*0.1 , height: 0.15}, Services.Scene);
            subPaddle.parent = this.hitbox;
            subPaddle.owner = this;
            Services.Collision!.add(subPaddle);
            subPaddle.visibility = 0;
        }

        this.trigger1 = MeshBuilder.CreateBox("paddleTrigger", {size: 0.15, width: 7 , height: 0.15}, Services.Scene);
        this.trigger2 = MeshBuilder.CreateBox("paddleTrigger", {size: 0.15, width: 7 , height: 0.15}, Services.Scene);
        this.trigger3 = MeshBuilder.CreateBox("paddleTrigger", {size: 0.15, width: 7 , height: 0.15}, Services.Scene);
		// this.hitbox = MeshBuilder.CreateBox("paddle", {size: 0.30, width: 5.0 , height: 0.30});
        let material: StandardMaterial;
        if (nbr === 1) {
            material = new StandardMaterial("playerMat1", Services.Scene);
            //cyan-blue
            material.emissiveColor = new Color3(0.2, 0.8, 1);
        }
        else {
            material = new StandardMaterial("playerMat2", Services.Scene);
            //pink-red
            material.emissiveColor = new Color3(0.8, 0, 0.8);
        }
        this.model.material = material;
        this.model.isPickable = false;
        this.model.visibility = 1;

        this.hitbox.material = material;
        this.hitbox.visibility = 0;
        this.trigger1.material = material;
        this.trigger1.visibility = 0;
        this.trigger2.material = material;
        this.trigger2.visibility = 0;
        this.trigger3.material = material;
        this.trigger3.visibility = 0;

        this.hitbox.isPickable = true;
        Services.Collision!.add(this.hitbox);
        Services.Collision!.add(this.trigger1);
        Services.Collision!.add(this.trigger2);

        this.direction = new Vector3(0, 0, 0);

        this.owner = owner;
        this.hitbox.owner = this;
        this.trigger1.owner = this;
        this.trigger2.owner = this;
    }

    getDirection(): Vector3 {
        return this.direction.clone();
    }
    setDirection(direction: Vector3) {
        this.direction = direction;
    }
    setHitboxDirection(hitboxDirection: Vector3) {
        this.hitboxDirection = hitboxDirection;
        this.hitbox.setDirection(hitboxDirection);
    }
    setModelDirection(modelDirection: Vector3) {
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
        this.hitbox.position.copyFrom(position);
    }
    setModelPosition(position: Vector3) {
        this.model.position.copyFrom(position);
    }

    setTrigger1Position(position: Vector3) {
        this.trigger1.position.copyFrom(position);
    }
    setTrigger2Position(position: Vector3) {
        this.trigger2.position.copyFrom(position);
    }
    setTrigger3Position(position: Vector3) {
        this.trigger3.position.copyFrom(position);
    }

    getSpeed(): number {
        return this.speed;
    }

    move(deltaT: number) {
        const basePos : Vector3 = this.position;//this.hitbox.position.clone();
        deltaT = deltaT / 1000;
        const distance : number = this.speed * deltaT;
        const displacement : Vector3 = this.direction.scale(distance);
        let newPos : Vector3 = basePos.add(displacement);

        const playerBox = this.hitbox.getBoundingInfo().boundingBox.extendSize;
        const maxX = Services.Dimensions!.x / 2 - playerBox.x;
        
        newPos.x = Math.min(Math.max(newPos.x, -maxX), maxX);
        //this.hitbox.position.copyFrom(newPos);
        //this.position.copyFrom(newPos);
        this.setFullPosition(newPos);
    }

    onBallHit(ball: Ball) {
        let abstractPaddlePos : Vector3 = new Vector3(this.hitbox.position.x, 0, this.hitbox.position.z).add(this.hitboxDirection.scale(-0.225));
        let abstractBallPos : Vector3 = new Vector3(ball.position.x, 0, ball.position.z);
        let newDir : Vector3 = abstractBallPos.subtract(abstractPaddlePos).normalize();

        let angle : number = Math.acos(Vector3.Dot(this.hitboxDirection, newDir));
        let cross : number = this.hitboxDirection.x * newDir.z - this.hitboxDirection.z * newDir.x;
        angle = cross >= 0 ? angle : -angle;


        if (angle < -Math.PI / 3) {
            angle = -Math.PI / 3;
            //newDir = this.direction.scale(Math.cos(angle)).add(newDir.scale(Math.sin(angle))).normalize();
            newDir = MathUtils.rotateOnXZ(this.hitboxDirection, angle);
        }
        else if (angle > Math.PI / 3) {
            angle = Math.PI / 3;
            //newDir = new Vector3(Math.sin(angle), 0, Math.cos(angle));
            newDir = MathUtils.rotateOnXZ(this.hitboxDirection, angle);
        }
        ball.setDir(newDir);
        //ball.bounce(hitInfo);
        ball.speedUp();
        ball.owner = this.owner;
        //console.log("Ball hit by paddle, new direction : ", newDir, " angle : ", angle);
        Services.EventBus!.emit("PaddleHitBall", {paddle: this, ball: ball});
    }

    public reconcile(predictedPos: Vector3, truthPos: Vector3): void {
        const previousPos = predictedPos;

        this.position.copyFrom(truthPos);
        
        const jump = previousPos.subtract(this.position);

        //console.log("Paddle reconcile. Server pos: ", serverPos, " Previous pos: ", previousPos, " New pos: ", this.position, " Jump: ", jump);
        
        this.visualOffset.addInPlace(jump);

        //this.hitbox.position.copyFrom(this.position).addInPlace(this.visualOffset);
    }

    update(deltaT: number) {
        this.move(deltaT);
        this.hitbox.computeWorldMatrix(true);
        this.hitbox.getChildren().forEach(child => {
            child.computeWorldMatrix(true);
        });
    }

    render() {
        //this.visualOffset = Vector3.Lerp(this.visualOffset, Vector3.Zero(), 0.03);
        Vector3.LerpToRef(this.visualOffset, Vector3.Zero(), 0.3, this.visualOffset);
        if (this.visualOffset.lengthSquared() < 0.0001) {
            this.visualOffset.setAll(0);
        }
        this.model.position.copyFrom(this.position).addInPlace(this.visualOffset);
    }

    dispose() {
        this.hitbox.dispose();
        this.trigger1.dispose();
        this.trigger2.dispose();
    }
}

export default Paddle;