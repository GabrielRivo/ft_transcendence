
import { Scene, Vector3, Mesh, MeshBuilder, Color4, Ray, Effect, PickingInfo, StandardMaterial, Color3} from "@babylonjs/core";
import HitEffect from "./Effects/HitEffect";
import ShockwaveEffect from "./Effects/ShockwaveEffect";
import MathUtils from "./MathUtils";
import Services from "./Services/Services";

import {OwnedMesh} from "./globalType";
import DeathBar from "./DeathBar";
import Paddle from "./Paddle";

class Ball {
    model: OwnedMesh;

    hitEffect: HitEffect;
    shockwaveEffect: ShockwaveEffect;
    displayEffect: boolean = true;

    direction!: Vector3;
    position!: Vector3;
    speed: number = 3;
    maxSpeed: number = 150;
    acceleration: number = 1.1;
    diameter: number = 0.25;
    moving: boolean = true;
    startMovingTime: number = 0;
    owner: any;

    private visualOffset: Vector3 = new Vector3(0, 0, 0);

    constructor(model?: Mesh) {
        let white : Color4 = new Color4(1, 1, 1, 1);
        this.model = model ?? MeshBuilder.CreateSphere("ball", { diameter: this.diameter});

        this.startDirection();

        let material = new StandardMaterial("ballmat", Services.Scene);
        material.emissiveColor = new Color3(0, 1, 1);
        this.model.material = material;
        this.model.isPickable = false;

        Services.Collision!.add(this.model);

        this.owner = null;
        this.model.owner = this;

        this.hitEffect = new HitEffect();
        this.shockwaveEffect = new ShockwaveEffect();
    }

    getPosition(): Vector3 {
        return this.position.clone();
    }
    setPos(position: Vector3) {
        this.position = position;
    }
    setFullPos(position: Vector3) {
        this.position = position;
        this.model.position.copyFrom(position);
    }

    getDirection(): Vector3 {
        return this.direction.clone();
    }
    setDir(direction: Vector3) {
        this.direction = direction.normalize();
    }
    setFullDir(direction: Vector3) {
        this.direction = direction.normalize();
        this.model.setDirection(this.direction);
    }

    getSpeed(): number {
        return this.speed;
    }
    setSpeed(speed: number) {
        this.speed = speed;
    }

    speedUp() {
        if (this.speed < this.maxSpeed)
            this.speed *= this.acceleration;
    }

    startDirection() {
        //let angle : number = (Math.random() * Math.PI / 2) - (Math.PI / 4); // + ou moin PI pour le sens
        let angle : number = Math.PI;
		this.setFullDir(new Vector3(Math.sin(angle), 0, Math.cos(angle)));
    }

	startDirectionRandom() {
        let angle : number = (Math.random() * Math.PI / 2) - (Math.PI / 4); // + ou moin PI pour le sens
        //let angle : number = Math.PI;
		this.setFullDir(new Vector3(Math.sin(angle), 0, Math.cos(angle)));
    }

    setMoving(moving: boolean) {
        this.moving = moving;
    }
    isMoving() : boolean {
        return this.moving;
    }
    getStartMovingTime(): number {
        return this.startMovingTime;
    }

    public generate(delay: number) {
        this.startDirection();
        this.setSpeed(3);
        this.setFullPos(new Vector3(0, 0.125, 0));
        this.moving = false;

        const currentTime = Services.TimeService!.getTimestamp();
        
        this.startMovingTime = currentTime + delay;
    }

    private test: boolean = true;
    private static readonly EPSILON = 1e-10;

    move(deltaT: number, paddle1: Paddle, paddle2: Paddle) {
        if (!this.moving)
            return;
        let currentTime = Services.TimeService!.getTimestamp() - deltaT;

        let remainingDeltaT = deltaT / 1000;
        
        // let distance : number = this.speed * deltaT;
        // let displacement : Vector3 = this.direction.scale(distance);
        // let newPos : Vector3 = this.position.add(displacement);
        let distance : number;
        let displacement : Vector3;
        let newPos : Vector3 = this.position;
        
        let ray : Ray;
        

        const initPaddlePos1 = paddle1.getPosition();
        const initPaddlePos2 = paddle2.getPosition();

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
            newPos = this.position.add(displacement);


            let paddle1CollisionTime = this.findRelativeCollisionTime(paddle1, displacement, deltaT);
            let paddle2CollisionTime = this.findRelativeCollisionTime(paddle2, displacement, deltaT);
            let otherCollisionTime = this.findCollisionTime(distance, deltaT);
            
            // Tri explicite pour garantir le déterminisme
            let collisionTimes = [
                { time: paddle1CollisionTime, id: 0 },
                { time: paddle2CollisionTime, id: 1 },
                { time: otherCollisionTime, id: 2 }
            ].sort((a, b) => {
                const diff = a.time - b.time;
                return Math.abs(diff) < Ball.EPSILON ? a.id - b.id : diff;
            });
            
            deltaT = collisionTimes[0].time;



            if (Math.abs(deltaT - remainingDeltaT) < Ball.EPSILON) {
                //console.log("No collision detected within remaining deltaT.");
                //console.log("paddle1CollisionTime: " + paddle1CollisionTime + ", paddle2CollisionTime: " + paddle2CollisionTime + ", otherCollisionTime: " + otherCollisionTime);
                //console.log("Continuing with deltaT: " + deltaT);
            }
            else {
                //console.log("COLLISION detected, adjusting deltaT to: " + deltaT);
                //console.log("paddle1CollisionTime: ", paddle1CollisionTime, ", paddle2CollisionTime: ", paddle2CollisionTime, ", otherCollisionTime: ", otherCollisionTime);
                //console.log("paddle1CollisionTime: " + paddle1CollisionTime + ", paddle2CollisionTime: " + paddle2CollisionTime + ", otherCollisionTime: " + otherCollisionTime);
                //this.test = false;
                if (this.test)
                {
                    //console.log("Collision at : ", currentTime , " + ", deltaT);
                    this.test = false;
                }
            }
            paddle1.update(deltaT);
            paddle2.update(deltaT);

            distance = this.speed * deltaT;
            displacement = this.direction.scale(distance);
            newPos = this.position.add(displacement);

            ray = new Ray(this.position, this.direction, distance + (this.diameter / 2) + 0.01);

            let hit = this.hitRay(ray);
            if (!hit || !hit.pickedMesh) {
                this.setPos(newPos);
                break;
            }

            //console.log("DeltaT : ", deltaT, " RemainingDeltaT : ", remainingDeltaT, " Distance : ", distance, " Hit mesh : ", hit.pickedMesh.name);
            //console.log("Paddle1Time: ", paddle1CollisionTime, " Paddle2Time: ", paddle2CollisionTime, " OtherTime: ", otherCollisionTime);

            let traveledDistance = hit.distance - (this.diameter / 2);
            this.setPos(this.direction.scale(traveledDistance).add(this.position));

            this.hit(hit);
            /*let i = 0
            this.moving = false;
            this.setFullPos(this.position);
            this.hit(hit);
            while (i < 100)
            {
                await MathUtils.wait(500);
                //this.hit(hit);
                i++;
            }*/

            distance = distance - traveledDistance;
            deltaT = (distance) / this.speed;

            displacement = this.direction.scale(distance);
            newPos = this.position.add(displacement);

            remainingDeltaT -= deltaT;
            if (Math.abs(remainingDeltaT) < Ball.EPSILON) {
                remainingDeltaT = 0;
            }

            /*ray.origin = this.position, ray.direction = this.direction, ray.length = distance + (this.diameter / 2);
            hit = this.hitRay(ray);*/
        }
        //this.model.setDirection(this.direction);
        //this.setFullPos(newPos);
        paddle1.setPosition(initPaddlePos1);
        paddle2.setPosition(initPaddlePos2);
        if (!this.moving)
        {
            newPos = this.position;
        }
        this.setPos(newPos);
    }

    public findCollisionTime(distance: number, deltaT: number) : number {

        const rayLen = distance + (this.diameter / 2);

        const ray = new Ray(this.position, this.direction, rayLen);
        let hit = this.hitRay(ray);

        if (hit && hit.pickedMesh && hit.pickedMesh.name !== "paddle") {
            const traveledDistance = hit.distance - (this.diameter / 2);
            //console.log("Collision detected at distance: " + traveledDistance + " initial distance: " + distance);
            const timeToCollision = (traveledDistance / distance) * deltaT;
            return Math.max(0, timeToCollision);
        }
        return deltaT;
    }

    public findRelativeCollisionTime(paddle: Paddle, displacement: Vector3, deltaT: number) : number {

        const paddleDisplacement = paddle.getDirection().scale(paddle.getSpeed() * deltaT);

        const relativeDisplacement = displacement.subtract(paddleDisplacement);
        const relativeDist = relativeDisplacement.length();
        
        if (relativeDist < Ball.EPSILON) {
            return deltaT;
        }

        const rayDir = relativeDisplacement.normalize();
        const rayLen = relativeDist + (this.diameter / 2);

        const ray = new Ray(this.position, rayDir, rayLen);
        let hit = this.hitRay(ray);

        if (hit && hit.pickedMesh && (hit.pickedMesh === paddle.model)) {
            const traveledDistance = hit.distance - (this.diameter / 2);
            //console.log("Collision detected at distance: " + traveledDistance + " initial distance: " + relativeDist);

            const timeToCollision = (traveledDistance / relativeDist) * deltaT;
            if (timeToCollision < 0)
            {
                //console.log("Negative time to collision detected! : " + timeToCollision);
                return 0;
            }
            return timeToCollision;
        }
        return deltaT;
    }

    public hitRay(ray: Ray) : PickingInfo | null {
        let overlapping = Services.Collision!.isInside(this.position, "paddle");
        let hit = Services.Scene!.pickWithRay(ray, (mesh) => mesh !== this.model && mesh.isPickable && !overlapping.find(m => m === mesh));
        if (hit && hit.pickedMesh) {
            return hit;
        }
        return null;
    }

    hit(hitInfo: PickingInfo) {
        const pickedMesh : OwnedMesh = hitInfo.pickedMesh as OwnedMesh;
        const name : string = pickedMesh.name;

        if (name === "deathBar" || name === "paddle" || name === "wall") {
            let impact = this.findRadialImpact(pickedMesh);
            if (impact) {
                let normalVec = impact.getNormal(true);
                if (impact.pickedPoint && normalVec)
                {
                    if (this.displayEffect) {
                        this.shockwaveEffect.play(impact.pickedPoint, normalVec);
                        this.hitEffect.play(impact.pickedPoint, normalVec);
                    }

                    pickedMesh.owner.onBallHit(this, impact);
                    //this.bounce(impact);
                }
            }
            else {
                this.moving = false;
                console.log("No radial impact found!");
            }
        }
    }

    findRadialImpact(collidedMesh : OwnedMesh) : PickingInfo | null {
        const radius = this.diameter / 2;
        let ray : Ray = new Ray(this.position, this.direction, radius + 0.1); //+1 Test needed
        const accuracy = 8;

        let shortestDist : number = radius + 0.1; //+1
        let impact : PickingInfo | null = null;
        
        let rayDirection : Vector3;
        const left = new Vector3(this.direction.z, 0, -this.direction.x);
        const overlapping : Mesh[] = Services.Collision!.isInside(this.position, "paddle");

        for (let i = 0; i <= accuracy; i++) {
            let step : number = i / accuracy;
            let angle : number = -Math.PI / 2 + step * Math.PI;

            rayDirection = this.direction.scale(Math.cos(angle)).add(left.scale(Math.sin(angle))).normalize();
            ray.direction = rayDirection;
            let hit = Services.Scene!.pickWithRay(ray, (mesh) => mesh !== this.model && mesh.isPickable && !overlapping?.find(m => m === mesh));
        
            if (hit && hit.pickedMesh && hit.pickedMesh === collidedMesh && hit.distance < shortestDist) {
                shortestDist = hit.distance; 
                impact = pickingInfoClone(hit);
            }
        }
        if (!impact) {
            this.findRadialImpactDebug();
            this.moving = false;
        }
        return impact;
    }

    findRadialImpactDebug() : PickingInfo | null {
        const radius = this.diameter / 2;
        let ray : Ray = new Ray(this.position, this.direction, radius + 1);
        const accuracy = 8;

        let shortestDist : number = radius + 1;
        let impact : PickingInfo | null = null;
        
        let rayDirection : Vector3;
        const left = new Vector3(this.direction.z, 0, -this.direction.x);
        const overlapping : Mesh[] = Services.Collision!.isInside(this.position, "paddle");

        //white : origin
        let sphere = MeshBuilder.CreateSphere("debugSphere", {diameter: 0.03}, Services.Scene);
        sphere.isPickable = false;
        sphere.position = ray.origin;
        let debugMat = new StandardMaterial("debugMat", Services.Scene);
        debugMat.emissiveColor = new Color3(1, 1, 1);
        sphere.material = debugMat;

        for (let i = 0; i <= accuracy; i++) {
            let step : number = i / accuracy;
            let angle : number = -Math.PI / 2 + step * Math.PI;

            rayDirection = this.direction.scale(Math.cos(angle)).add(left.scale(Math.sin(angle))).normalize();
            ray.direction = rayDirection;
            let hit = Services.Scene!.pickWithRay(ray, (mesh) => mesh !== this.model && mesh.isPickable && !overlapping?.find(m => m === mesh));
        

            if (hit && hit.pickedMesh && hit.distance < shortestDist) {

                //red : hit point
                let sphere = MeshBuilder.CreateSphere("debugSphere", {diameter: 0.03}, Services.Scene);
                sphere.isPickable = false;
                sphere.position = hit.pickedPoint as Vector3;
                let debugMat = new StandardMaterial("debugMat", Services.Scene);
                debugMat.emissiveColor = new Color3(1, 0, 0);
                sphere.material = debugMat;

                //cyan : normal point
                sphere = MeshBuilder.CreateSphere("debugSphere", {diameter: 0.03}, Services.Scene);
                sphere.isPickable = false;
                sphere.position = hit.pickedPoint!.add(hit.getNormal(true)!.scale(0.1));
                let mat = new StandardMaterial("debugMat2", Services.Scene);
                mat.emissiveColor = new Color3(0, 1, 1);
                sphere.material = mat;


                shortestDist = hit.distance; 
                impact = pickingInfoClone(hit);
                if (!impact)
                {
                    console.log("Failed to clone PickingInfo!");
                    return null;
                }

                /*//yellow : impact normal
                sphere = MeshBuilder.CreateSphere("debugSphere", {diameter: 0.03}, Services.Scene);
                sphere.isPickable = false;
                sphere.position = impact.pickedPoint!.add(impact.getNormal(true)!.scale(0.1));
                let debugMat2 = new StandardMaterial("debugMat", Services.Scene);
                debugMat2.emissiveColor = new Color3(0, 1, 1);
                sphere.material = debugMat2;
                sphere.visibility = 0.5;*/
            }
            else if (hit && hit.pickedMesh)
            {
                let sphere = MeshBuilder.CreateSphere("debugSphere", {diameter: 0.03}, Services.Scene);
                sphere.isPickable = false;
                sphere.position = hit.pickedPoint as Vector3;
                let debugMat = new StandardMaterial("debugMat", Services.Scene);
                debugMat.emissiveColor = new Color3(1, 0, 0);
                sphere.material = debugMat;

                sphere = MeshBuilder.CreateSphere("debugSphere", {diameter: 0.03}, Services.Scene);
                sphere.isPickable = false;
                sphere.position = hit.pickedPoint!.add(hit.getNormal(true)!.scale(0.1));
                let mat = new StandardMaterial("debugMat2", Services.Scene);
                mat.emissiveColor = new Color3(0, 1, 1);
                sphere.material = mat;
            }
            else
            {
                let sphere = MeshBuilder.CreateSphere("debugSphere", {diameter: 0.03}, Services.Scene);
                sphere.isPickable = false;
                sphere.position = ray.origin.add(ray.direction.scale(ray.length));
                let debugMat = new StandardMaterial("debugMat", Services.Scene);
                debugMat.emissiveColor = new Color3(1, 0, 0);
                sphere.material = debugMat;
            }
        }

        if (!impact)
            return null;
        //green : final impact normal
        let sphere2 = MeshBuilder.CreateSphere("debugSphere", {diameter: 0.03}, Services.Scene);
        sphere2.isPickable = false;
        sphere2.position = impact?.pickedPoint!.add(impact.getNormal(true)!.scale(0.1));
        let debugMat2 = new StandardMaterial("debugMat", Services.Scene);
        debugMat2.emissiveColor = new Color3(1, 1, 0);
        sphere.material = debugMat2;
        sphere.visibility = 0.5;
        
        return impact;
        //return null;
    }

    bounce(hitInfo: PickingInfo) {
        let normal : Vector3 | null = hitInfo.getNormal(true);
        if (!normal)
            console.log("No normal found for bounce!");
        else
            this.setDir(MathUtils.reflectVector(this.direction, normal));
    }

    public reconcile(serverPos: Vector3, serverDir: Vector3, serverSpeed: number): void {
        const previousPos = this.position.clone();

        this.position.copyFrom(serverPos);
        
        const jump = previousPos.subtract(this.position);

        //console.log("Ball reconcile. Server pos: ", serverPos, " Previous pos: ", previousPos, " New pos: ", this.position, " Jump: ", jump);
        
        this.visualOffset.addInPlace(jump);

        this.model.position.copyFrom(this.position).addInPlace(this.visualOffset);

        this.setDir(serverDir);
        this.setSpeed(serverSpeed);
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
        this.visualOffset = Vector3.Lerp(this.visualOffset, Vector3.Zero(), 0.01);
        if (this.visualOffset.lengthSquared() < 0.001) {
            this.visualOffset.setAll(0);
        }
        this.model.setDirection(this.direction);
        this.model.position.copyFrom(this.position).addInPlace(this.visualOffset);
    }

    dispose() {
        this.moving = false;
        Services.Collision!.remove(this.model);
        this.model.dispose();

        setTimeout(() => {
            this.hitEffect.dispose();
        }, 1000);
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