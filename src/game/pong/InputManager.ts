
import Pong from "./Game/Pong.js";
import { LEFT, RIGHT, NONE } from "./Player.js";
import Player from "./Player.js";
import { Socket } from "node_modules/socket.io/dist/socket.js";
import History from "./Utils/History.js";
import type { PlayerDirectionData } from "./globalType.js";



class InputManager {
    private game: Pong;

    private p1InputBuffer: History<PlayerDirectionData>;
    private p2InputBuffer: History<PlayerDirectionData>;

    constructor(game: Pong) {
        this.game = game;
        this.p1InputBuffer = new History<PlayerDirectionData>(100);
        this.p2InputBuffer = new History<PlayerDirectionData>(100);
    }

    public getP1InputBuffer(): History<PlayerDirectionData> {
        return this.p1InputBuffer;
    }

    public getP2InputBuffer(): History<PlayerDirectionData> {
        return this.p2InputBuffer;
    }

    public setPlayerDirection(player: Player, data: PlayerDirectionData) {
        switch (data.direction) {
            case LEFT:
                player.setPaddleDirectionFromMovement(LEFT);
                break;
            case RIGHT:
                player.setPaddleDirectionFromMovement(RIGHT);
                break;
            case NONE:
                player.setPaddleDirectionFromMovement(NONE);
                break;
        }
    }

    public async recordInput(client: Socket, data: PlayerDirectionData) {
        const playerBuffer: History<PlayerDirectionData> = (this.game.player1!.id === client.data.userId) ? this.p1InputBuffer : this.p2InputBuffer;
        playerBuffer.addStateStrict(data);
    }

    public dispose() {
    }
}

export default InputManager;