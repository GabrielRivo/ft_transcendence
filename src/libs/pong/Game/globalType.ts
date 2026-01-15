import DeathBar from "./DeathBar";
import Ball from "./Ball";
import { Mesh, Vector3 } from "@babylonjs/core";
import { Movement } from "./Player";

export interface OwnedMesh<T = any> extends Mesh {
    owner?: T;
}

export interface DeathBarPayload {
    deathBar: DeathBar;
    ball: Ball;
}

export interface GameEnded {
    name: string;
    winnerId: string;
    score: { [playerId: string]: number };
}

export interface GameState {
    timestamp: number;
    p1: {
        pos: Vector3;
        dir: Vector3;
    };
    p2: {
        pos: Vector3;
        dir: Vector3;
    };
    ball: {
        pos: Vector3;
        dir: Vector3;
        speed: number;
        moving: boolean;
    }
}

export type MenuState = "pongMenu" | "online" | "local" | "loading" | "matchmaking" | "off";

export interface PlayerInputData {
    timestamp: number;
    direction: Movement;
    isPressed: boolean;
    isResolved: boolean;
}

export interface PlayerDirectionData {
    timestamp: number;
    direction: Movement;
}