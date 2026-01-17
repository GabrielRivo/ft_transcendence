
import { Scene, Engine, Vector2, Mesh } from "@babylonjs/core";
import GameService from "./GameService";
import EventBus from "./EventBus";
import CollisionService from "./CollisionService";
import TimeService from "./TimeService";
// import SocketService from "./SocketService";

class ServicesSingleton {
    private static instance: ServicesSingleton;

    Canvas?: HTMLCanvasElement;
    Scene?: Scene;
    Engine?: Engine;
    Dimensions?: Vector2;
    EventBus?: EventBus;
    GameService?: GameService;
    Collision?: CollisionService;
    TimeService?: TimeService;

    private constructor() {
    }

    static getInstance(): ServicesSingleton {
        if (!ServicesSingleton.instance) {
            ServicesSingleton.instance = new ServicesSingleton();
        }
        return ServicesSingleton.instance;
    }

    private initNbr = 0;
    init(canvas : HTMLCanvasElement) {
        if (this.GameService?.isRunning()) {
            console.warn("[Services] Game is running. Disposing it before re-initializing services.");
            this.GameService.stopGame();
        }

        if (this.Engine) {
            console.warn("[Services] Engine already exists. Disposing old one first.");
            this.Canvas?.remove();
            this.Engine.dispose();
        }
        
        console.log('[Services] Initializing services...' + this.initNbr++);
        this.Canvas = canvas;

        this.Engine = new Engine(this.Canvas, true);
        const pixelRatio = window.devicePixelRatio || 1;
        this.Engine!.setHardwareScalingLevel(1 / pixelRatio);
        this.EventBus = EventBus.getInstance();
        this.GameService = GameService.getInstance();
        this.Collision = CollisionService.getInstance();
        this.TimeService = TimeService.getInstance();
        
        window.addEventListener("resize", () => {
            if (!this.Engine) return;
            this.Engine!.setHardwareScalingLevel(1 / window.devicePixelRatio);
            this.Engine!.resize();
        });
    }

    disposeServices() {
        console.log('[Services] Disposing services...');
        this.Scene?.dispose();
        this.Engine?.dispose();
        this.EventBus?.clear();
        this.GameService?.dispose();
        this.Collision?.clear();
        this.Canvas?.remove();

        this.Canvas = undefined;
        this.Scene = undefined;
        this.Engine = undefined;
        this.EventBus = undefined;
        this.GameService = undefined;
        this.Collision = undefined;
        this.Dimensions = undefined;
    }
}

const Services = ServicesSingleton.getInstance();

export default Services;