abstract class Game {

    constructor() {
    }
    abstract initialize() : void;
    abstract launch() : void;
    abstract start() : void;
    abstract dispose() : void;
}

export default Game;