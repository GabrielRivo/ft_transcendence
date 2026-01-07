
import { Scene, Vector3, Mesh, MeshBuilder, Color4, Ray, Effect, PickingInfo, StandardMaterial, Color3} from "@babylonjs/core";
import MathUtils from "./MathUtils.js";
import Services from "./Services/Services.js";

import {OwnedMesh} from "./globalType.js";
import DeathBar from "./DeathBar.js";

class Ball {
    private services: Services;

    model: OwnedMesh;
    direction!: Vector3;
    position!: Vector3;
    speed: number = 4;
    maxSpeed: number = 150;
    acceleration: number = 1.1;
    diameter: number = 0.25;
    moving: boolean = true;
    owner: any;

    constructor(services: Services, model?: Mesh) {
        this.services = services;
        this.model = model ?? MeshBuilder.CreateSphere("ball", { diameter: this.diameter});
        // this.setFullDir(new Vector3(1, 0, 1));
        this.startDirection();
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
	getPosition() : Vector3 {
		return this.position;
	}

    setDir(direction: Vector3) {
        this.direction = direction.normalize();
    }
    setFullDir(direction: Vector3) {
        this.direction = direction.normalize();
        this.model.setDirection(this.direction);
    }
	getDirection() : Vector3 {
		return this.direction;
	}

    speedUp() {
        if (this.speed < this.maxSpeed)
            this.speed *= this.acceleration;
    }

    startDirection() {
        let angle : number = (Math.random() * Math.PI / 2) - (Math.PI / 4);
        this.setFullDir(new Vector3(Math.sin(angle), 0, Math.cos(angle)));
    }

    move() {
        if (!this.moving)
            return;

        let deltaT : number = this.services.Engine!.getDeltaTime() / 1000;
        let distance : number = this.speed * deltaT;
        const displacement : Vector3 = this.direction.scale(distance);
        let newPos : Vector3 = this.position.add(displacement);
        
        let ray = new Ray(this.position, this.direction, distance + (this.diameter / 2));
        let overlapping = this.services.Collision!.isInside(this.position, "paddle");

        let hit = this.services.Scene!.pickWithRay(ray, (mesh) => mesh !== this.model && mesh.isPickable && !overlapping.find(m => m === mesh));
        
        while (hit && hit.pickedMesh) {
            console.log("Ball hit detected with mesh: " + hit.pickedMesh.name);
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
            if (!this.moving)
            {
                newPos = this.position;
                break;
            }
            newPos = this.position.add(this.direction.scale(this.speed * deltaT));
            ray.origin = this.position, ray.direction = this.direction, ray.length = distance + (this.diameter / 2);
            overlapping = this.services.Collision!.isInside(this.position, "paddle");
            hit = this.services.Scene!.pickWithRay(ray, (mesh) => mesh !== this.model && mesh.isPickable && !overlapping?.find(m => m === mesh));
        }
        this.model.setDirection(this.direction);
        this.setFullPos(newPos);
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
        let ray : Ray = new Ray(this.position, this.direction, radius + 1);
        const accuracy = 8;

        let shortestDist : number = radius + 1;
        let impact : PickingInfo | null = null;
        
        let rayDirection : Vector3;
        const left = new Vector3(this.direction.z, 0, -this.direction.x);
        const overlapping : Mesh[] = this.services.Collision!.isInside(this.position, "paddle");

        for (let i = 0; i <= accuracy; i++) {
            let step : number = i / accuracy;
            let angle : number = -Math.PI / 2 + step * Math.PI;

            rayDirection = this.direction.scale(Math.cos(angle)).add(left.scale(Math.sin(angle))).normalize();
            ray.direction = rayDirection;
            let hit = this.services.Scene!.pickWithRay(ray, (mesh) => mesh !== this.model && mesh.isPickable && !overlapping?.find(m => m === mesh));
        
            if (hit && hit.pickedMesh && hit.pickedMesh === collidedMesh && hit.distance < shortestDist) {
                shortestDist = hit.distance; 
                impact = pickingInfoClone(hit);
            }
        }
        if (!impact) {
            this.moving = false;
        }
        return impact;
    }

    bounce(hitInfo: PickingInfo) {
        let normal : Vector3 | null = hitInfo.getNormal(true);
        if (!normal)
            console.log("No normal found for bounce!");
        else
            this.setDir(MathUtils.reflectVector(this.direction, normal));
    }

    update() {
        this.move();
    }

    dispose() {
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