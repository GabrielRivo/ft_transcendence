import { Scene, Vector2, Vector3 } from "@babylonjs/core";
import { Socket, Namespace } from "socket.io";

import Services from "../Services/Services.js";
import { GameService } from "../../game.service.js";
import { GameType } from "../../game.dto.js";

import { DeathBarPayload } from "../globalType.js";
import Player from "../Player.js";
import Ball from "../Ball.js";
import Wall from "../Wall.js";
import InputManager from "../InputManager.js";
import Game from "./Game.js";
import TruthManager from "./TruthManager.js";

import { GameFinishedEvent } from '../../game.events.js';

class Pong extends Game {
    private gameService: GameService;
    private services: Services;

    private p1Socket: Socket | null;
    private p2Socket: Socket | null;
    private p1Id: string;
    private p2Id: string;
    private p1Ready: boolean = false;
    private p2Ready: boolean = false;
    private nsp: Namespace | null;
    public id: string;

    inputManager?: InputManager;
    truthManager?: TruthManager;

    player1?: Player;
    player2?: Player;
    ball?: Ball;
    walls?: Wall[];
    width: number = 7;
    height: number = 12;

    private gameState: "waiting" | "playing" | null;

    private gameType: GameType;

    private disconnectTimeout: Map<string, NodeJS.Timeout | null> = new Map();
    private disconnectForgivingP1: number = 0;
    private disconnectForgivingP2: number = 0;

    private startingTimeout: NodeJS.Timeout | null = null;
    private tournamentId?: string | undefined;
    private isFinal: boolean = false;

    // Store game result for socket emission in dispose()
    private gameEndResult?: {
        winnerId: string | null;
        player1Score: number;
        player2Score: number;
    };

    constructor(id: string, p1Id: string, p2Id: string, gameType: GameType, gameService: GameService, tournamentId?: string, isFinal?: boolean) {
        super();
        this.id = id;
        this.p1Socket = null;
        this.p2Socket = null;
        this.nsp = null;
        this.p1Id = p1Id;
        this.p2Id = p2Id;

        this.gameType = gameType;

        this.gameService = gameService;
        this.gameState = "waiting";
        this.tournamentId = tournamentId;
        this.isFinal = isFinal || false;

        this.services = new Services();

        this.startingTimeout = setTimeout(() => {
            this.endGame('disconnection');
        }, 20000);
    }

    initialize(): void {
        this.services.TimeService!.initialize();
        this.services.Scene = new Scene(this.services.Engine!);
        this.services.Dimensions = new Vector2(this.width, this.height);

        this.inputManager = new InputManager(this);
        this.truthManager = new TruthManager(this.services, this);

        this.services.EventBus!.on("DeathBarHit", this.onDeathBarHit);

        this.drawScene();
    }

    drawScene(): void {

        this.player1 = new Player(this.services, this.p1Id);
        this.player2 = new Player(this.services, this.p2Id);
        this.walls = [new Wall(this.services), new Wall(this.services)];
        this.walls.forEach(wall => this.services.Scene!.addMesh(wall.model));

        this.player1.paddle.setModelDirection(new Vector3(0, 0, 1));
        this.player2.paddle.setModelDirection(new Vector3(0, 0, -1));
        this.player1.paddle.setPosition(new Vector3(0, 0.15, -this.height / 2 + 2));
        this.player2.paddle.setPosition(new Vector3(0, 0.15, this.height / 2 - 2));
        this.player1.paddle.setTrigger1Position(new Vector3(0, 0.15, -this.height / 2 + 2));
        this.player2.paddle.setTrigger1Position(new Vector3(0, 0.15, this.height / 2 - 2));
        this.player1.paddle.setTrigger2Position(new Vector3(0, 0.15, -this.height / 2 + 2 - 0.075));
        this.player2.paddle.setTrigger2Position(new Vector3(0, 0.15, this.height / 2 - 2 + 0.075));
        this.player1.paddle.setTrigger3Position(new Vector3(0, 0.15, -this.height / 2 + 2 - 0.15));
        this.player2.paddle.setTrigger3Position(new Vector3(0, 0.15, this.height / 2 - 2 + 0.15));
        this.player1.deathBar.model.position = new Vector3(0, 0.125, -this.height / 2 + 1);
        this.player2.deathBar.model.position = new Vector3(0, 0.125, this.height / 2 - 1);
        this.walls[0]!.model.position = new Vector3(-this.width / 2 - 0.1, 0.25, 0);
        this.walls[1]!.model.position = new Vector3(this.width / 2 + 0.1, 0.25, 0);
    }

    public async playerConnected(client: Socket) {
        if (!this.nsp) {
            this.nsp = client.nsp;
        }

        if (this.p1Id === client.data.userId) {
            this.p1Socket = client;
        }
        else if (this.p2Id === client.data.userId) {
            this.p2Socket = client;
        }
        await client.join(this.id);

        if (this.disconnectTimeout.has(client.data.userId)) {
            clearTimeout(this.disconnectTimeout.get(client.data.userId)!);
            this.disconnectTimeout.delete(client.data.userId);
        }
        if (client.connected === false)
            return;
        const playerNbr: number = this.p1Id === client.data.userId ? 1 : 2;
        if (playerNbr === 1)
            this.p1Ready = true;
        else
            this.p2Ready = true;

        client.emit("gameJoined", {
            gameId: this.id,
            player1Id: this.p1Id,
            player2Id: this.p2Id,
            player1Score: this.player1!.score,
            player2Score: this.player2!.score,
            message: `Joined game ${this.id} successfully!`,
            player: playerNbr,
            gameType: this.gameType,
            tournamentId: this.tournamentId,
            isFinal: this.isFinal
        });
        if (this.p1Ready && this.p2Ready) {
            if (this.startingTimeout)
                clearTimeout(this.startingTimeout);
            if (playerNbr === 1)
                this.disconnectForgivingP1 += 1;
            else
                this.disconnectForgivingP2 += 1;

            if (playerNbr === 1 && this.disconnectForgivingP1 > 3 || playerNbr === 2 && this.disconnectForgivingP2 > 3)
                client.emit("gameStarted", { timestamp: this.services.TimeService!.getTimestamp(), gameId: this.id, message: `Player ${client.data.userId} reconnected too many times. Game will run without forgiving.` });
            else
                this.run(`Player ${client.data.userId} connected. Starting game...`);
        }
    }

    public playerDisconnected(client: Socket) {
        if (this.p1Id === client.data.userId && this.disconnectForgivingP1 < 3 || this.p2Id === client.data.userId && this.disconnectForgivingP2 < 3) {
            this.stop(`Player ${client.data.userId} has disconnected. Waiting for reconnection...`);
            if (this.p1Id === client.data.userId)
                this.p1Ready = false;
            else
                this.p2Ready = false;
        }

        if (!this.disconnectTimeout.has(client.data.userId)) {
            this.disconnectTimeout.set(client.data.userId,
                setTimeout(() => {
                    if (this.p1Socket?.disconnected || this.p2Socket?.disconnected)
                        this.endGame('disconnection');
                }, 10000)
            );
        }
    }

    private onDeathBarHit = (payload: DeathBarPayload) => {
        this.ball!.setFullPos(new Vector3(0, -100, 0));
        let playerScoring: Player;
        let scoredSide: number;
        let scoringSide: number;

        if (payload.deathBar.owner === this.player1) {
            playerScoring = this.player2!;
            scoredSide = 1;
            scoringSide = 2;
        }
        else {
            playerScoring = this.player1!;
            scoredSide = 2;
            scoringSide = 1;
        }

        if (playerScoring.score < 5) {
            playerScoring.scoreUp();
        }

        this.nsp!.to(this.id).emit('score', { scoringPlayer: scoringSide, player1Score: this.player1!.score, player2Score: this.player2!.score });

        this.gameService.publishScoreUpdate(this.id, this.p1Id, this.p2Id, this.player1!.score, this.player2!.score);

        if (this.player1!.score === 5 || this.player2!.score === 5) {

            setTimeout(() => {
                this.endGame('score_limit');
            }, this.tournamentId ? 0 : 3500);

            return;
        }

        this.ball!.generate(2000, scoredSide);

        this.nsp!.to(this.id).emit('generateBall', { timestamp: this.services.TimeService!.getTimestamp(), ballDirection: this.ball!.getDirection() });
    }

    public sendGameState(): void {
        this.nsp!.to(this.id).emit('gameUpdate', {
            timestamp: this.services.TimeService!.getTimestamp(),
            p1: {
                pos: this.player1!.paddle.getPosition(),
                dir: this.player1!.paddle.getDirection(),
            },
            p2: {
                pos: this.player2!.paddle.getPosition(),
                dir: this.player2!.paddle.getDirection(),
            },
            ball: {
                pos: this.ball!.getPosition(),
                dir: this.ball!.getDirection(),
                speed: this.ball!.getSpeed(),
                moving: this.ball!.isMoving()
            }
        });
    }

    run(message?: string) {
        if (this.p1Socket?.connected === false || this.p2Socket?.connected === false)
            return;
        if (!this.p1Ready || !this.p2Ready)
            return;

        if (this.gameState === "waiting" || this.gameState === null) {
            this.gameState = "playing";
            this.services.TimeService!.update();
            if (!this.ball) {
                this.ball = new Ball(this.services);
                this.ball.generate(2000, Math.random() < 0.5 ? 1 : 2);
                this.nsp!.to(this.id).emit('generateBall', { timestamp: this.services.TimeService!.getTimestamp() });
            }
            this.sendGameState();
            this.nsp!.to(this.id).emit('gameStarted', { timestamp: this.services.TimeService!.getTimestamp(), gameId: this.id, message: message || `Game ${this.id} is now running.` });
            this.truthManager!.resetLastFrameTime();
            this.services.Engine!.stopRenderLoop();
            this.services.Engine!.runRenderLoop(() => {
                this.truthManager!.truthUpdate();
            });
        }
    }

    stop(message?: string) {
        if (this.gameState === "playing" || this.gameState === null) {
            this.gameState = "waiting";
            this.nsp!.to(this.id).emit('gameStopped', { gameId: this.id, message: message || `Game ${this.id} has been paused.` });
            this.services.Engine!.stopRenderLoop();
            this.services.Engine!.runRenderLoop(() => { });
        }
    }

    endGame(reason: 'score_limit' | 'surrender' | 'disconnection' | 'timeout', explicitWinnerId?: string): void {
        let winnerId: string | null = null;

        if (this.player1!.score > this.player2!.score)
            winnerId = this.p1Id;
        else if (this.player2!.score > this.player1!.score)
            winnerId = this.p2Id;
        else
            winnerId = Math.random() < 0.5 ? this.p1Id : this.p2Id;


        if (reason === 'disconnection' && this.player1!.score < 5 && this.player2!.score < 5) {
            const disconnectionWinnerId = this.p1Socket?.connected ? this.p1Id : this.p2Socket?.connected ? this.p2Id : null;
            if (disconnectionWinnerId)
                winnerId = disconnectionWinnerId;
        }

        if (explicitWinnerId) {
            winnerId = explicitWinnerId;
        }

        let gameFinishedEvent: GameFinishedEvent = {
            eventName: 'game.finished',
            gameType: this.gameType,
            gameId: this.id,
            player1Id: this.p1Id,
            player2Id: this.p2Id,
            score1: this.player1?.score || 0,
            score2: this.player2?.score || 0,
            winnerId: winnerId,
            reason: reason,
            timestamp: this.services.TimeService!.getTimestamp(),
            hitPlayer1: this.player1?.hitCount || 0,
            hitPlayer2: this.player2?.hitCount || 0,
            isTournamentFinal: this.isFinal
        };

        // Store result for socket emission in dispose()
        this.gameEndResult = {
            winnerId: winnerId,
            player1Score: this.player1?.score || 0,
            player2Score: this.player2?.score || 0,
        };

        this.gameService.publishGameFinished(gameFinishedEvent);
        this.dispose();
    }

    dispose(): void {
        this.disconnectTimeout.forEach((timeout) => {
            if (timeout) {
                clearTimeout(timeout);
            }
        });
        this.disconnectTimeout.clear();

        this.services.Engine!.stopRenderLoop();

        this.player1?.dispose();
        this.player2?.dispose();
        this.ball?.dispose();
        this.walls?.forEach(wall => wall.dispose());
        this.inputManager?.dispose();
        this.services.EventBus!.off("DeathBarHit", this.onDeathBarHit);
        this.services.Scene!.dispose();

        // Emit enriched gameEnded event with all necessary data for frontend redirection
        this.nsp?.to(this.id).emit('gameEnded', {
            gameId: this.id,
            winnerId: this.gameEndResult?.winnerId || null,
            player1Id: this.p1Id,
            player2Id: this.p2Id,
            player1Score: this.gameEndResult?.player1Score || 0,
            player2Score: this.gameEndResult?.player2Score || 0,
            gameType: this.gameType,
            tournamentId: this.tournamentId,
        });

        this.services.Collision!.clear();
        
        this.gameService.removeGame(this, this.p1Id, this.p2Id);
    }
}

export default Pong;