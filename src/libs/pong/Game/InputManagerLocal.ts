
import { KeyboardEventTypes } from "@babylonjs/core";
import PongLocal from "./Game/PongLocal";
import { LEFT, RIGHT } from "./Player";
import Services from "./Services/Services";

class InputManager {
    private game: PongLocal;

    constructor(game: PongLocal) {
        this.game = game;
    }

    listenToP1() {
        Services.Scene!.onKeyboardObservable.add((kbInfo) => {
        switch (kbInfo.type) {
            case KeyboardEventTypes.KEYDOWN:
            {
                switch (kbInfo.event.key) {
                    case "a":
                        this.game.player1!.setPaddleDirectionFromKeyboard(LEFT, true);
                        break;
                    case "d":
                        this.game.player1!.setPaddleDirectionFromKeyboard(RIGHT, true);
                        break;
                }
                break;
            }
            case KeyboardEventTypes.KEYUP:
            {
                switch (kbInfo.event.key) {
                    case "a":
                        this.game.player1!.setPaddleDirectionFromKeyboard(LEFT, false);
                        break;
                    case "d":
                        this.game.player1!.setPaddleDirectionFromKeyboard(RIGHT, false);
                        break;
                }
                break;
            }
        }
        });
    }

    listenToP2() {
        Services.Scene!.onKeyboardObservable.add((kbInfo) => {
        switch (kbInfo.type) {
            case KeyboardEventTypes.KEYDOWN:
            {
                switch (kbInfo.event.key) {
                    case "j":
                        this.game.player2!.setPaddleDirectionFromKeyboard(LEFT, true);
                        break;
                    case "l":
                        this.game.player2!.setPaddleDirectionFromKeyboard(RIGHT, true);
                        break;
                }
                break;
            }
            case KeyboardEventTypes.KEYUP:
            {
                switch (kbInfo.event.key) {
                    case "j":
                        this.game.player2!.setPaddleDirectionFromKeyboard(LEFT, false);
                        break;
                    case "l":
                        this.game.player2!.setPaddleDirectionFromKeyboard(RIGHT, false);
                        break;
                }
                break;
            }
        }
        });
    }

    dispose() : void {
        Services.Scene!.onKeyboardObservable.clear();
    }
}

export default InputManager;