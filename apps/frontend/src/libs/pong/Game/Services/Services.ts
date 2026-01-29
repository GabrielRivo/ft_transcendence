
import { Scene, Engine, Vector2 } from "@babylonjs/core";
import GameService from "./GameService";
import EventBus from "./EventBus";
import CollisionService from "./CollisionService";
import TimeService from "./TimeService";
import AssetCache from "./AssetCache";


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
    AssetCache = AssetCache;

    private constructor() {
    }

    static getInstance(): ServicesSingleton {
        if (!ServicesSingleton.instance) {
            ServicesSingleton.instance = new ServicesSingleton();
        }
        return ServicesSingleton.instance;
    }

    public initNbr = 0;
    init(canvas : HTMLCanvasElement) {
        if (this.GameService?.isRunning()) {
            this.GameService.stopGame();
        }

        if (this.Engine) {
            this.Canvas?.remove();
            this.Engine.dispose();
        }
        
        this.Canvas = canvas;
        this.Canvas?.addEventListener('wheel', (e) => {
        }, { passive: true });

        this.Engine = new Engine(this.Canvas, true, {});
        this.Engine.getCaps().parallelShaderCompile = undefined; 
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