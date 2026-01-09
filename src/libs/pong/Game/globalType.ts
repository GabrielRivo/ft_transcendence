import DeathBar from './DeathBar';
import Ball from './Ball';
import { Mesh } from '@babylonjs/core';

export interface OwnedMesh<T = unknown> extends Mesh {
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

export type MenuState = 'pongMenu' | 'online' | 'local' | 'loading' | 'matchmaking' | 'off';
