
import {Vector3, Mesh, MeshBuilder, StandardMaterial, Color3, Color4 } from "@babylonjs/core";
import Game from "./Game/Game";
import DeathBar from "./DeathBar";
import Paddle from "./Paddle";
import { OwnedMesh } from "./globalType";

let idDefault = 0;

export enum Movement {
    LEFT = "left",
    RIGHT = "right",
    NONE = "none"
}

export const { LEFT, RIGHT, NONE} = Movement;

type input = {
    left: boolean,
    right: boolean,
    none?: boolean
}

class Player {
    id: string;
    paddle: Paddle;
    deathBar: DeathBar;
    direction: Vector3 = new Vector3(0, 0, 0);
    input: input = {left: false, right: false};
    speed : number = 7;
    score: number = 0;

    constructor(id?: string) {
        this.id = id ?? "player" + (idDefault++);
        this.paddle = new Paddle(this);
        this.paddle.owner = this;
        this.deathBar = new DeathBar(undefined, this);
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
        this.paddle.setDirection(this.direction);
    }

    setPaddleDirection(direction: Vector3) {
        this.direction = direction;
        this.paddle.setDirection(direction);
    }
    setPaddleDirectionFromKeyboard(direction : Movement, isPressed : boolean) {
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

    scoreUp(value ?: number) {
        this.score += value ?? 1;
        //console.log("Player " + this.id + " score: " + this.score);
    }
    scoreDown(value ?: number) {
        this.score -= value ?? 1;
        //console.log("Player " + this.id + " score: " + this.score);
    }
    scoreReset() {
        this.score = 0;
        //console.log("Player " + this.id + " score: " + this.score);
    }
    getScore() : number {
        return this.score;
    }
    setScore(value : number) {
        this.score = value;
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