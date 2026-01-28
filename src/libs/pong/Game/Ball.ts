
import { Scene, Vector3, Mesh, MeshBuilder, Color4, Ray, Effect, PickingInfo, StandardMaterial, Color3, Quaternion, Space} from "@babylonjs/core";
import HitEffect from "./Effects/HitEffect";
import ShockwaveEffect from "./Effects/ShockwaveEffect";
import MathUtils from "./MathUtils";
import Services from "./Services/Services";

import {OwnedMesh} from "./globalType";
import DeathBar from "./DeathBar";
import Paddle from "./Paddle";
import GenerateEffect from "./Effects/GenerateEffect";

class Ball {
    model: OwnedMesh;

    hitEffect: HitEffect;
    shockwaveEffect: ShockwaveEffect;
    generateEffect: GenerateEffect;
    displayEffect: boolean = true;

    direction!: Vector3;
    position!: Vector3;
    speed: number = 3;
    maxSpeed: number = 50;
    acceleration: number = 1.1;
    diameter: number = 0.25;
    moving: boolean = true;
    startMovingTime: number = 0;
    owner: any;

    private visualOffset: Vector3 = new Vector3(0, 0, 0);
    //private totalDistance: number = 0;

    private generateTImeoutId: NodeJS.Timeout | null = null;

    constructor() {
        let white : Color4 = new Color4(1, 1, 1, 1);
        this.model = MeshBuilder.CreateSphere("ball", { diameter: this.diameter}, Services.Scene);
        if (!this.model.rotationQuaternion) {
            this.model.rotationQuaternion = new Quaternion();
        }

        this.startDirection(Math.random() < 0.5 ? 1 : 2);

        let material = new StandardMaterial("ballmat", Services.Scene);
        material.emissiveColor = new Color3(0, 1, 1);
        this.model.material = material;
        this.model.visibility = 1;
        this.model.isPickable = false;

        Services.Collision!.add(this.model);

        this.owner = null;
        this.model.owner = this;

        this.hitEffect = new HitEffect();
        this.shockwaveEffect = new ShockwaveEffect();
        this.generateEffect = new GenerateEffect();
    }

    getPosition(): Vector3 {
        return this.position.clone();
    }
    setPos(position: Vector3) {
        this.position = position;
    }
    setModelPos(position: Vector3) {
        this.model.position.copyFrom(position);
    }

    getDirection(): Vector3 {
        return this.direction.clone();
    }
    setDir(direction: Vector3) {
        this.direction = direction.normalize();
    }
    setModelDir(direction: Vector3) {
        this.model.setDirection(direction);
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

    startDirection(side: number) {
        let angle : number = (Math.random() * Math.PI / 2) - (Math.PI / 4);
        if (side == 1) {
            angle += Math.PI;
        }
        //let angle: number = Math.PI;
        this.setDir(new Vector3(Math.sin(angle), 0, Math.cos(angle)));
        return this.direction;
    }

	startDirectionRandom() {
        let angle : number = (Math.random() * Math.PI / 2) - (Math.PI / 4); // + ou moin PI pour le sens
        //let angle : number = Math.PI;
		this.setDir(new Vector3(Math.sin(angle), 0, Math.cos(angle)));
        this.setModelDir(this.direction);
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

    setModelMesh(mesh: Mesh) {
        const visibility = this.model.visibility;
        this.model.dispose();
        this.model = mesh as OwnedMesh;
        if (visibility === 0) {
            this.model.getChildMeshes().forEach(mesh => {
                mesh.isVisible = false;
            });
        }
        if (!this.model.rotationQuaternion) {
            this.model.rotationQuaternion = new Quaternion();
        }
        this.model.isPickable = false;
        Services.Collision!.add(this.model);
        this.model.owner = this;
        this.setModelPos(this.position);
    }

    public generate(delay: number, side: number, direction?: Vector3) {
        this.model.getChildMeshes().forEach(mesh => {
            mesh.isVisible = false;
        });
        this.model.visibility = 0;

        if (!direction)
            this.startDirection(side);
        else
            this.setDir(direction);
        //this.totalDistance = 0;
        this.setSpeed(3);
        this.setPos(new Vector3(0, 0.125, 0));
        this.setModelPos(this.position);
        this.moving = false;

        const currentTime = Services.TimeService!.getTimestamp();
        
        this.startMovingTime = currentTime + delay;

        this.generateTImeoutId = setTimeout(() => {
            this.model.visibility = 1;
            this.generateEffect.play(this.model);
            this.model.getChildMeshes().forEach(mesh => {
                mesh.isVisible = true;
            });
        }, 1500);
    }

    private testId: number = 0;
    private static readonly EPSILON = 1e-10;

    move(deltaT: number, paddle1: Paddle, paddle2: Paddle) {
        if (!this.moving)
            return;

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
        const initPaddleDir1 = paddle1.getDirection();
        const initPaddleDir2 = paddle2.getDirection();

        let excludedMeshes: Mesh[] = [];
        excludedMeshes.push(this.model, paddle1.hitbox, ...paddle1.hitbox.getChildren() as Mesh[], paddle2.hitbox, ...paddle2.hitbox.getChildren() as Mesh[]);

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


            //let paddle1CollisionTime = this.findRelativeCollisionTime(paddle1, displacement, deltaT);
            //let paddle2CollisionTime = this.findRelativeCollisionTime(paddle2, displacement, deltaT);
            let CollisionTime = this.findCollisionTime(distance, deltaT, excludedMeshes);
            
            /*let collisionTimes = [
                { time: paddle1CollisionTime, id: 0 },
                { time: paddle2CollisionTime, id: 1 },
                { time: otherCollisionTime, id: 2 }
            ].sort((a, b) => {
                const diff = a.time - b.time;
                return Math.abs(diff) < Ball.EPSILON ? a.id - b.id : diff;
            });*/
            
            if (CollisionTime < 0)
                deltaT = 0;
            else
                deltaT = CollisionTime;

            paddle1.update(deltaT * 1000);
            paddle2.update(deltaT * 1000);

            distance = this.speed * deltaT;
            displacement = this.direction.scale(distance);
            newPos = this.position.add(displacement); // distance parcourue sur deltaT

            ray = new Ray(this.position, this.direction, distance + (this.diameter / 2) + 0.001);

            let hit = this.hitRay(ray, excludedMeshes);
            if (!hit || !hit.pickedMesh) {
                this.setPos(newPos);
                break;
            }
            //console.log("Collision happened near the center of the paddle of : ", hit.pickedMesh.position.subtract(hit.pickedPoint!));
            //console.log("DeltaT : ", deltaT, " RemainingDeltaT : ", remainingDeltaT, " Distance : ", distance, " Hit mesh : ", hit.pickedMesh.name);
            //console.log("Paddle1Time: ", paddle1CollisionTime, " Paddle2Time: ", paddle2CollisionTime, " OtherTime: ", otherCollisionTime);

            let traveledDistance = hit.distance - (this.diameter / 2);
            this.setPos(this.direction.scale(traveledDistance).add(this.position));

            if (!this.hit(hit)) {
                this.setPos(newPos);
                //CollisionTime = deltaT;
            }
            //console.log("Ball move loop  deltaT estimated to : ", deltaT);
            //console.log("Ball collided with ", hit.pickedMesh.name, " at distance ", traveledDistance, " deltaT adjusted to ", deltaT);
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
        if (!this.moving)
        {
            newPos = this.position;
        }
        this.setPos(newPos);
    }

    public findCollisionTime(distance: number, deltaT: number, excludedMeshes: Mesh[]) : number {

        const rayLen = distance + (this.diameter / 2);

        const ray = new Ray(this.position, this.direction, rayLen);
        let hit = this.hitRay(ray, excludedMeshes);

        if (hit && hit.pickedMesh /*&& hit.pickedMesh.name !== "paddle"*/) {
            const traveledDistance = hit.distance - (this.diameter / 2);
            //console.log("Collision detected at distance: " + traveledDistance + " initial distance: " + distance);
            const timeToCollision = (traveledDistance / distance) * deltaT;
            if (timeToCollision < 0 && hit.pickedMesh.name === "paddleTrigger")
            {
                excludedMeshes.push(hit.pickedMesh as OwnedMesh);
                return this.findCollisionTime(distance, deltaT, excludedMeshes);
            }
            // return Math.max(0, timeToCollision);
            return timeToCollision;
        }
        return deltaT;
    }


    public hitRay(ray: Ray, excludedMeshes: Mesh[]) : PickingInfo | null {
        let overlapping = Services.Collision!.isInside(this.position, "paddle");
        overlapping.push(...Services.Collision!.isInside(this.position, "paddleTrigger"));
        let hit = Services.Scene!.pickWithRay(ray, (mesh) => /*mesh !== this.model &&*/ mesh.isPickable && !overlapping.find(m => m === mesh) && !excludedMeshes.find(m => m === mesh));
        if (hit && hit.pickedMesh) {
            return hit;
        }
        return null;
    }

    hit(hitInfo: PickingInfo): boolean {
        const pickedMesh : OwnedMesh = hitInfo.pickedMesh as OwnedMesh;
        const name : string = pickedMesh.name;

        if (name === "deathBar" || /*name === "paddle" ||*/ name === "wall" || name === "paddleTrigger") {
            const impact = this.findRadialImpact(pickedMesh);
            if (impact) {
                const normalVec = impact.getNormal(true);
                const impactMesh: OwnedMesh = impact.pickedMesh as OwnedMesh;
                if (impactMesh && impact.pickedPoint && normalVec)
                {
                    if (this.displayEffect) {
                        this.shockwaveEffect.play(impact.pickedPoint, normalVec);
                        this.hitEffect.play(impact.pickedPoint, normalVec);
                    }

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
                if (pickedMesh.name === "paddleTrigger") {
                    return false;
                }
                this.moving = false;
                console.log("No radial impact found!");
            }
        }
        return false;
    }

    findRadialImpact(collidedMesh : OwnedMesh) : PickingInfo | null {
        const radius = this.diameter / 2;
        let ray : Ray = new Ray(this.position, this.direction, radius + 0.001); //+1 Test needed
        const accuracy = 8;

        let shortestDist : number = radius + 0.001; //+1
        let impact : PickingInfo | null = null;
        
        let rayDirection : Vector3;
        const left = new Vector3(this.direction.z, 0, -this.direction.x);
        const overlapping : Mesh[] = Services.Collision!.isInside(this.position, "paddle");

        for (let i = 0; i <= accuracy; i++) {
            let step : number = i / accuracy;
            let angle : number = -Math.PI / 2 + step * Math.PI;

            rayDirection = this.direction.scale(Math.cos(angle)).add(left.scale(Math.sin(angle))).normalize();
            ray.direction = rayDirection;
            let hit = Services.Scene!.pickWithRay(ray, (mesh) => mesh !== this.model && mesh.isPickable && !overlapping?.find(m => m === mesh) && mesh.name !== "paddleTrigger");
        
            if (hit && hit.pickedMesh && (hit.pickedMesh === collidedMesh || collidedMesh.name === "paddleTrigger" && hit.pickedMesh.name === "paddle") && hit.distance < shortestDist) {
                shortestDist = hit.distance; 
                impact = pickingInfoClone(hit);
            }
        }
        if (!impact) {
            if (collidedMesh.name === "paddleTrigger")
                return null;
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
            let hit = Services.Scene!.pickWithRay(ray, (mesh) => mesh !== this.model && mesh.isPickable && !overlapping?.find(m => m === mesh) && mesh.name !== "paddleTrigger");
        

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
        {
            this.setDir(MathUtils.reflectVector(this.direction, normal));
            Services.EventBus!.emit("BallBounce", {ball : this});
        }
    }

    public reconcile(predictedPos: Vector3, serverPos: Vector3, serverDir: Vector3, serverSpeed: number): void {
        const previousPos = predictedPos;

        this.position.copyFrom(serverPos);
        
        const jump = previousPos.subtract(this.position);

        //console.log("Ball reconcile. Server pos: ", serverPos, " Previous pos: ", previousPos, " New pos: ", this.position, " Jump: ", jump);
        
        this.visualOffset.addInPlace(jump);

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
    }

    render(deltaT: number) {
        this.visualOffset = Vector3.Lerp(this.visualOffset, Vector3.Zero(), 0.3);
        if (this.visualOffset.lengthSquared() < 0.001) {
            this.visualOffset.setAll(0);
        } 


        const distanceTraveled = this.speed * (deltaT / 1000);

        const rotationAxis = Vector3.Cross(Vector3.Up(), this.direction);

        const rotationFactor = 1 / (this.diameter / 2) / 2;

        this.model.rotate(rotationAxis, distanceTraveled * rotationFactor, Space.WORLD);

        this.model.position.copyFrom(this.position).addInPlace(this.visualOffset);
    }

    dispose() {
        this.moving = false;
        Services.Collision!.remove(this.model);
        this.model.dispose();

        if (this.generateTImeoutId) {
            clearTimeout(this.generateTImeoutId);
            this.generateTImeoutId = null;
        }

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