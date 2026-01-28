
import { Vector3 } from "@babylonjs/core";
import DeathBar from "./DeathBar.js";
import Paddle from "./Paddle.js";
import Services from "./Services/Services.js";

let idDefault = 0;

export enum Movement {
    LEFT = "left",
    RIGHT = "right",
    NONE = "none"

}

export const { LEFT, RIGHT, NONE } = Movement;

type input = {
    left: boolean,
    right: boolean,
    none?: boolean
}

class Player {
    private services: Services;

    id: string;
    paddle: Paddle;
    deathBar: DeathBar;
    direction: Vector3 = new Vector3(0, 0, 0);
    input: input = { left: false, right: false };
    speed: number = 7;
    score: number = 0;

    hitCount: number = 0;

    constructor(services: Services, id?: string) {
        this.services = services;
        this.id = id ?? "player" + (idDefault++);
        this.paddle = new Paddle(this.services, this);
        this.paddle.owner = this;
        this.deathBar = new DeathBar(this.services, undefined, this);
        this.deathBar.owner = this;
    }

    setPaddleDirectionFromMovement(movement: Movement) {
        switch (movement) {
            case LEFT:
                this.direction.x = -1;
                break;
            case RIGHT:
                this.direction.x = 1;
                break;
            case NONE:
                this.direction.x = 0;
                break;
        }
        //console.log("Player " + this.id + " set direction to ", this.direction);
        this.paddle.setDirection(this.direction);
    }

    setPaddleDirection(direction: Vector3) {
        this.paddle.setDirection(direction);
    }
    setPaddleDirectionFromKeyboard(direction: Movement, isPressed: boolean) {
        if (this.input[direction] === isPressed)
            return;
        this.input[direction] = isPressed;
        this.direction.x = 0;
        Object.keys(this.input).forEach(key => {
            switch (key) {
                case "left":
                    this.direction.x -= this.input.left ? 1 : 0;
                    break;
                case "right":
                    this.direction.x += this.input.right ? 1 : 0;
                    break;
            }
        })
        this.paddle.setDirection(this.direction);
    }

    scoreUp(value?: number) {
        this.score += value ?? 1;
        //console.log("Player " + this.id + " score: " + this.score);
    }
    scoreDown(value?: number) {
        this.score -= value ?? 1;
        //console.log("Player " + this.id + " score: " + this.score);
    }
    scoreReset() {
        this.score = 0;
        //console.log("Player " + this.id + " score: " + this.score);
    }

    update(deltaT: number) {
        this.paddle.update(deltaT);
    }

    dispose() {
        this.paddle.dispose();
        this.deathBar.dispose();
    }
}

export default Player;