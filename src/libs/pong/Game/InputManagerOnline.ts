
import PongOnline from "./Game/PongOnline.js";
import Services from "./Services/Services.js";
import { KeyboardEventTypes } from "@babylonjs/core";
import { LEFT, Movement, NONE, RIGHT } from "./Player.js";
import Player from "./Player.js";
import History from "./Utils/History.js";
import type { PlayerInputData, PlayerDirectionData } from "./globalType.js";

import { gameSocket as socket } from "../../socket";

class InputManager {
    private game: PongOnline;

    private inputBuffer: History<PlayerDirectionData>;
    private rawInputBuffer: History<PlayerInputData>;
 
    constructor(game: PongOnline) {
        this.game = game;
        this.inputBuffer = new History<PlayerInputData>(100);
        this.rawInputBuffer = new History<PlayerInputData>(100);

        window.addEventListener("blur", this.resetInputs);
    }

    private resetInputs = () => {
        const time = Services.TimeService!.getTimestamp();
        this.recordInput({ timestamp: time, direction: LEFT, isPressed: false, isResolved: false });
        this.recordInput({ timestamp: time, direction: RIGHT, isPressed: false, isResolved: false });
    }

    public getInputBuffer(): History<PlayerDirectionData> {
        return this.inputBuffer;
    }

    public getPlayerDirection(player: Player) : PlayerDirectionData {
        let movement : Movement;
        if (player.direction.x === -1)
            movement = LEFT;
        else if (player.direction.x === 1)
            movement = RIGHT;
        else if (player.direction.x === 0)
            movement = NONE;
        return {
            timestamp: Services.TimeService!.getTimestamp(),
            direction: movement! 
        };
    }
    public setPlayerDirection(player: Player, data: PlayerDirectionData, sendToServer: boolean) {
        const previousDir : Movement = player.direction.x === -1 ? LEFT : player.direction.x === 1 ? RIGHT : NONE;
        if (previousDir === data.direction)
            return

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

        if (sendToServer && socket.connected) {
            //console.log("EMITTING playerDirection:", data);
            socket.emit("playerDirection", data);
        }
    }

    public processPlayerInput(player : Player, data: PlayerInputData) {
        switch (data.direction) {
            case LEFT:
                player.setPaddleDirectionFromKeyboard(LEFT, data.isPressed);
                break;
            case RIGHT:
                player.setPaddleDirectionFromKeyboard(RIGHT, data.isPressed);
                break;
        }
    }
    

    public processLastInputs(player: Player) {
        const lastPlayerDirection = player.paddle.getDirection();
        const time = Services.TimeService!.getTimestamp();
        let inputs : PlayerInputData[] = this.rawInputBuffer.getStatesInRange(time - 200, time);
        inputs.forEach((input) => {
            if (input.isResolved === false) {
                this.processPlayerInput(player, input);
                input.isResolved = true;
            }
        });
        const currentPlayerDirection = player.paddle.getDirection();
        
        if (lastPlayerDirection._x !== currentPlayerDirection._x) {
            this.inputBuffer.addStateStrict(this.getPlayerDirection(player));
            player.setPaddleDirection(lastPlayerDirection);
        }
    }

    public async recordInput(data: PlayerInputData) {
        this.rawInputBuffer.addStateStrict(data);
    }

    listenToPlayer1() {
        Services.Scene!.onKeyboardObservable.clear();
        Services.Scene!.onKeyboardObservable.add((kbInfo) => {
            // if (!socket.connected)
            //     return;
            switch (kbInfo.type) {
                case KeyboardEventTypes.KEYDOWN:
                {
                    switch (kbInfo.event.key) {
                        case "a":
                            this.recordInput({ timestamp: Services.TimeService!.getTimestamp(), direction: LEFT, isPressed: true, isResolved: false });
                            //socket.emit("playerInput", { timestamp: Services.TimeService!.getTimestamp(), direction: LEFT, isPressed: true });
                            break;
                        case "d":
                            this.recordInput({ timestamp: Services.TimeService!.getTimestamp(), direction: RIGHT, isPressed: true, isResolved: false });
                            //socket.emit("playerInput", { timestamp: Services.TimeService!.getTimestamp(), direction: RIGHT, isPressed: true });
                            break;
                        case "ArrowLeft":
                            this.recordInput({ timestamp: Services.TimeService!.getTimestamp(), direction: LEFT, isPressed: true, isResolved: false });
                            break;
                        case "ArrowRight":
                            this.recordInput({ timestamp: Services.TimeService!.getTimestamp(), direction: RIGHT, isPressed: true, isResolved: false });
                            break;
                    }
                    break;
                }
                case KeyboardEventTypes.KEYUP:
                {
                    switch (kbInfo.event.key) {
                        case "a":
                            this.recordInput({ timestamp: Services.TimeService!.getTimestamp(), direction: LEFT, isPressed: false, isResolved: false });
                            //socket.emit("playerInput", { timestamp: Services.TimeService!.getTimestamp(), direction: LEFT, isPressed: false });
                            break;
                        case "d":
                            this.recordInput({ timestamp: Services.TimeService!.getTimestamp(), direction: RIGHT, isPressed: false, isResolved: false });
                            //socket.emit("playerInput", { timestamp: Services.TimeService!.getTimestamp(), direction: RIGHT, isPressed: false });
                            break;
                        case "ArrowLeft":
                            this.recordInput({ timestamp: Services.TimeService!.getTimestamp(), direction: LEFT, isPressed: false, isResolved: false });
                            break;
                        case "ArrowRight":
                            this.recordInput({ timestamp: Services.TimeService!.getTimestamp(), direction: RIGHT, isPressed: false, isResolved: false });
                            break;  
                    }
                    break;
                }
            }
         //    console.log("Input recorded");
        });
    }

    listenToPlayer2() {
        Services.Scene!.onKeyboardObservable.clear();
        Services.Scene!.onKeyboardObservable.add((kbInfo) => {
            // if (!socket.connected)
            //     return;
            switch (kbInfo.type) {
                case KeyboardEventTypes.KEYDOWN:
                {
                    switch (kbInfo.event.key) {
                        case "d":
                            this.recordInput({ timestamp: Services.TimeService!.getTimestamp(), direction: LEFT, isPressed: true, isResolved: false });
                            //socket.emit("playerInput", { timestamp: Services.TimeService!.getTimestamp(), direction: LEFT, isPressed: true });
                            break;
                        case "a":
                            this.recordInput({ timestamp: Services.TimeService!.getTimestamp(), direction: RIGHT, isPressed: true, isResolved: false });
                            //socket.emit("playerInput", { timestamp: Services.TimeService!.getTimestamp(), direction: RIGHT, isPressed: true });
                            break;
                        case "ArrowRight":
                            this.recordInput({ timestamp: Services.TimeService!.getTimestamp(), direction: LEFT, isPressed: true, isResolved: false });
                            break;
                        case "ArrowLeft":
                            this.recordInput({ timestamp: Services.TimeService!.getTimestamp(), direction: RIGHT, isPressed: true, isResolved: false });
                            break;
                    }
                    break;
                }
                case KeyboardEventTypes.KEYUP:
                {
                    switch (kbInfo.event.key) {
                        case "d":
                            this.recordInput({ timestamp: Services.TimeService!.getTimestamp(), direction: LEFT, isPressed: false, isResolved: false });
                            //socket.emit("playerInput", { timestamp: Services.TimeService!.getTimestamp(), direction: LEFT, isPressed: false });
                            break;
                        case "a":
                            this.recordInput({ timestamp: Services.TimeService!.getTimestamp(), direction: RIGHT, isPressed: false, isResolved: false });
                            //socket.emit("playerInput", { timestamp: Services.TimeService!.getTimestamp(), direction: RIGHT, isPressed: false });
                            break;
                        case "ArrowRight":
                            this.recordInput({ timestamp: Services.TimeService!.getTimestamp(), direction: LEFT, isPressed: false, isResolved: false });
                            break;
                        case "ArrowLeft":
                            this.recordInput({ timestamp: Services.TimeService!.getTimestamp(), direction: RIGHT, isPressed: false, isResolved: false });
                            break;
                    }
                    break;
                }
            }
        });
       //  console.log("Input recorded");
    }

    public dispose() {
        window.removeEventListener("blur", () => this.resetInputs());
        Services.Scene!.onKeyboardObservable.clear();
    }
}

export default InputManager;