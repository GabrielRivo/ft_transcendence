
import { Vector3, Mesh, MeshBuilder, Ray, PickingInfo, StandardMaterial, Color3 } from "@babylonjs/core";
import MathUtils from "./MathUtils.js";
import Services from "./Services/Services.js";

import { OwnedMesh } from "./globalType.js";
import Paddle from "./Paddle.js";

class Ball {
    private services: Services;

    model: OwnedMesh;
    direction!: Vector3;
    position!: Vector3;
    speed: number = 3;
    maxSpeed: number = 150;
    acceleration: number = 1.1;
    diameter: number = 0.25;
    moving: boolean = true;
    startMovingTime: number = 0;
    owner: any;

    lastHit: OwnedMesh | null = null;

    constructor(services: Services, model?: Mesh) {
        this.services = services;
        this.model = model ?? MeshBuilder.CreateSphere("ball", { diameter: this.diameter });
        // this.setFullDir(new Vector3(1, 0, 1));
        this.startDirection(1);
        //this.model.setDirection(this.direction);
        let material = new StandardMaterial("ballmat", this.services.Scene);
        material.emissiveColor = new Color3(0, 1, 1);
        this.model.material = material;
        this.model.isPickable = false;

        this.services.Collision!.add(this.model);

        this.owner = null;
        this.model.owner = this;

    }

    setPos(position: Vector3) {
        this.position = position;
    }
    setFullPos(position: Vector3) {
        this.position = position;
        this.model.position.copyFrom(position);
    }
    getPosition(): Vector3 {
        return this.position.clone();
    }

    setDir(direction: Vector3) {
        this.direction = direction.normalize();
    }
    setFullDir(direction: Vector3) {
        this.direction = direction.normalize();
        this.model.setDirection(this.direction);
    }
    getDirection(): Vector3 {
        return this.direction.clone();
    }

    speedUp() {
        if (this.speed < this.maxSpeed)
            this.speed *= this.acceleration;
    }
    getSpeed(): number {
        return this.speed;
    }
    setSpeed(speed: number) {
        this.speed = speed;
    }

    setMoving(moving: boolean) {
        this.moving = moving;
    }
    isMoving(): boolean {
        return this.moving;
    }

    startDirection(side: number) {
        let angle: number = (Math.random() * Math.PI / 2) - (Math.PI / 4);
        if (side == 1) {
            angle += Math.PI;
        }
        //let angle: number = Math.PI;
        this.setFullDir(new Vector3(Math.sin(angle), 0, Math.cos(angle)).normalize());
    }

    public generate(delay: number, side: number) {
        this.startDirection(side);
        this.setSpeed(3);
        this.setFullPos(new Vector3(0, 0.125, 0));
        this.moving = false;

        const currentTime = this.services.TimeService!.getTimestamp();

        this.startMovingTime = currentTime + delay;
        //console.log("||||||||||||||||||||Ball generated||||||||||||||||||||||||||");
        //console.log("Ball will start moving at time:", this.startMovingTime, "current time:", currentTime);
    }


    private static readonly EPSILON = 1e-10;
    move(deltaT: number, paddle1: Paddle, paddle2: Paddle) {
        if (!this.moving)
            return;

        let remainingDeltaT = deltaT / 1000;

        // let distance : number = this.speed * deltaT;
        // let displacement : Vector3 = this.direction.scale(distance);
        // let newPos : Vector3 = this.position.add(displacement);
        let distance: number;
        let displacement: Vector3;
        let newPos: Vector3 = this.position;

        let ray: Ray;


        const initPaddlePos1 = paddle1.getPosition();
        const initPaddlePos2 = paddle2.getPosition();
        const initPaddleDir1 = paddle1.getDirection();
        const initPaddleDir2 = paddle2.getDirection();

        // let excludedMeshes: Mesh[] = [];
        // excludedMeshes.push(this.model, paddle1.model, paddle2.model);
        let excludedMeshes: OwnedMesh[] = [];
        excludedMeshes.push(this.model, paddle1.model, ...paddle1.model.getChildren() as OwnedMesh[], paddle2.model, ...paddle2.model.getChildren() as OwnedMesh[]);

        let loopCount = 0;
        while (remainingDeltaT > Ball.EPSILON && this.moving) {
            loopCount++;
            if (loopCount > 50) {
                //console.log("Ball move loop exceeded 50 iterations, breaking to avoid infinite loop.");
                break;
            }

            deltaT = remainingDeltaT;
            //console.log("Ball hit detected with mesh: " + hit.pickedMesh.name);

            distance = this.speed * deltaT;
            displacement = this.direction.scale(distance);
            //newPos = this.position.add(displacement);


            let CollisionTime = this.findCollisionTime(distance, deltaT, excludedMeshes);

            if (CollisionTime < 0)
                deltaT = 0;
            else
                deltaT = CollisionTime;

            paddle1.update(deltaT * 1000);
            paddle2.update(deltaT * 1000);

            distance = this.speed * deltaT;
            displacement = this.direction.scale(distance);
            newPos = this.position.add(displacement);

            ray = new Ray(this.position, this.direction, distance + (this.diameter / 2) + 0.001);

            let hit = this.hitRay(ray, excludedMeshes);
            if (!hit || !hit.pickedMesh) {
                this.setPos(newPos);
                break;
            }
            //console.log("Ball pos : ", this.position, " should not be between 3.925 and 4.075 Z");
            /*console.log("Ball pos before collision check: ", posbefore);
            console.log("Hit position: ", hit.pickedPoint);
            console.log("Trigger pos : ", paddle1.trigger.position, paddle2.trigger.position);
            console.log("Collision time : ", deltaT);*/

            let traveledDistance = hit.distance - (this.diameter / 2);
            this.setPos(this.direction.scale(traveledDistance).add(this.position));

            if (!this.hit(hit)) {
                this.setPos(newPos);
                //CollisionTime = deltaT;
            }
            if (hit.pickedMesh.name === "paddleTrigger")
                excludedMeshes.push(hit.pickedMesh as OwnedMesh);

            remainingDeltaT -= deltaT;//CollisionTime;
            if (Math.abs(remainingDeltaT) < Ball.EPSILON) {
                remainingDeltaT = 0;
            }

        }

        paddle1.setPosition(initPaddlePos1);
        paddle2.setPosition(initPaddlePos2);
        paddle1.setDirection(initPaddleDir1);
        paddle2.setDirection(initPaddleDir2);
        if (!this.moving) {
            newPos = this.position;
        }
        this.setPos(newPos);
    }

    public findCollisionTime(distance: number, deltaT: number, excludedMeshes: Mesh[]): number {

        const rayLen = distance + (this.diameter / 2);

        const ray = new Ray(this.position, this.direction, rayLen);
        let hit = this.hitRay(ray, excludedMeshes);

        if (hit && hit.pickedMesh /*&& hit.pickedMesh.name !== "paddle"*/) {
            const traveledDistance = hit.distance - (this.diameter / 2);
            //console.log("Collision detected at distance: " + traveledDistance + " initial distance: " + distance);
            const timeToCollision = (traveledDistance / distance) * deltaT;
            if (timeToCollision < 0 && hit.pickedMesh.name === "paddleTrigger") {
                excludedMeshes.push(hit.pickedMesh as OwnedMesh);
                return this.findCollisionTime(distance, deltaT, excludedMeshes);
            }
            //return Math.max(0, timeToCollision);
            return timeToCollision;
        }
        return deltaT;
    }


    public hitRay(ray: Ray, excludedMeshes: Mesh[]): PickingInfo | null {
        let overlapping = this.services.Collision!.isInside(this.position, "paddle");
        overlapping.push(...this.services.Collision!.isInside(this.position, "paddleTrigger"));
        let hit = this.services.Scene!.pickWithRay(ray, (mesh) => /*mesh !== this.model &&*/ mesh.isPickable && !overlapping.find(m => m === mesh) && !excludedMeshes.find(m => m === mesh));
        if (hit && hit.pickedMesh) {
            return hit;
        }
        return null;
    }

    hit(hitInfo: PickingInfo): boolean {
        const pickedMesh: OwnedMesh = hitInfo.pickedMesh as OwnedMesh;
        const name: string = pickedMesh.name;

        if (name === "deathBar" /*|| name === "paddle"*/ || name === "wall" || name === "paddleTrigger") {
            const impact = this.findRadialImpact(pickedMesh);
            //console.log("Ball hit mesh: " + pickedMesh.name);
            if (impact) {
                const normalVec = impact.getNormal(true);
                const impactMesh: OwnedMesh = impact.pickedMesh as OwnedMesh;
                if (impactMesh && impact.pickedPoint && normalVec) {
                    /*if (impactMesh.name === "paddle")
                    {
                        this.bounce(impact);
                        return true;
                    }*/
                    impactMesh.owner.onBallHit(this, impact);
                    //this.bounce(impact);
                    return true;
                }
            }
            else {
                if (pickedMesh.name === "paddleTrigger")
                    return false;
                this.moving = false;
                console.log("No radial impact found!");
            }
        }
        return false;
    }

    findRadialImpact(collidedMesh: OwnedMesh): PickingInfo | null {
        const radius = this.diameter / 2;
        let ray: Ray = new Ray(this.position, this.direction, radius + 0.001); //+1 Test needed
        const accuracy = 8;

        let shortestDist: number = radius + 0.001; //+1
        let impact: PickingInfo | null = null;

        let rayDirection: Vector3;
        const left = new Vector3(this.direction.z, 0, -this.direction.x);
        const overlapping: Mesh[] = this.services.Collision!.isInside(this.position, "paddle");

        for (let i = 0; i <= accuracy; i++) {
            let step: number = i / accuracy;
            let angle: number = -Math.PI / 2 + step * Math.PI;

            rayDirection = this.direction.scale(Math.cos(angle)).add(left.scale(Math.sin(angle))).normalize();
            ray.direction = rayDirection;
            let hit = this.services.Scene!.pickWithRay(ray, (mesh) => mesh !== this.model && mesh.isPickable && !overlapping?.find(m => m === mesh) && mesh.name !== "paddleTrigger");

            if (hit && hit.pickedMesh && (hit.pickedMesh === collidedMesh || collidedMesh.name === "paddleTrigger" && hit.pickedMesh.name === "paddle") && hit.distance < shortestDist) {
                shortestDist = hit.distance;
                impact = pickingInfoClone(hit);
            }
        }
        if (!impact) {
            if (collidedMesh.name === "paddleTrigger")
                return null;
            this.moving = false;
        }
        return impact;
    }


    bounce(hitInfo: PickingInfo) {
        let normal: Vector3 | null = hitInfo.getNormal(true);
        if (!normal)
            console.log("No normal found for bounce!");
        else
            this.setDir(MathUtils.reflectVector(this.direction, normal));
    }

    updateMovingState(currentTime: number) {
        if (currentTime < this.startMovingTime) {
            this.moving = false;
        }
        else
            this.moving = true;
    }

    getStartingDeltaT(currentTime: number, deltaT: number): number {
        this.updateMovingState(currentTime);
        if (currentTime >= this.startMovingTime && currentTime - deltaT < this.startMovingTime) {
            this.moving = true;
            deltaT = currentTime - this.startMovingTime;
            //console.log("Ball started at time:", currentTime, "startMovingTime:", this.startMovingTime, "deltaT:", deltaT);
        }
        return deltaT;
    }

    update(currentTime: number, deltaT: number, paddle1: Paddle, paddle2: Paddle) {
        deltaT = this.getStartingDeltaT(currentTime, deltaT);
        this.move(deltaT, paddle1, paddle2);
        this.model.computeWorldMatrix(true);
    }

    dispose() {
        console.log("Disposing ball.");
        this.moving = false;
        this.services.Collision!.remove(this.model);
        this.model.dispose();
    }
}

function pickingInfoClone(info: PickingInfo): PickingInfo | null {
    let clone = Object.assign(new PickingInfo(), info);

    clone.pickedPoint = info.pickedPoint?.clone() || null;
    if (!clone.pickedPoint || !info.ray)
        return null;
    clone.ray = new Ray(info.ray.origin.clone(), info.ray.direction.clone(), info.ray.length);
    return clone;
}

export default Ball;